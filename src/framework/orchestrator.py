"""
Orchestrator — LiteLLM-powered agentic state machine.

Features:
  - Token Context Trimmer: sliding-window message pruner before LLM calls
  - Streaming Telemetry: stream=True with <thought> tag interception
  - Pydantic Tool Validation: schema enforcement with self-correction loop
  - Session Persistence: auto-save state for crash recovery
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional
import time

from langgraph.graph import StateGraph, END

from src.framework.config import ConfigProvider
from src.framework.context_trimmer import ContextTrimmer
from src.framework.tool_schemas import validate_tool_args
from src.framework.session_manager import SessionManager

logger = logging.getLogger(__name__)

# Max validation retries before hard-failing a task
MAX_VALIDATION_RETRIES = 3

# Standard LiteLLM/OpenAI tool schemas
TIER_1_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read file contents",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"}
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Write file contents",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "content": {"type": "string"}
                },
                "required": ["path", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_vault",
            "description": "List vault contents",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "execute_bash",
            "description": "Use this tool to compile and run any language code (C++, Bash, etc.) locally on the host environment when secure_sandbox=False.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string"}
                },
                "required": ["command"]
            }
        }
    }
]


class Orchestrator:
    def __init__(self, tui_app=None, ui_queue=None):
        self.tui_app = tui_app
        self.ui_queue = ui_queue
        self.config = ConfigProvider()
        self.model_name = self.config.get_model()

        # Context trimmer instance for this model
        self.trimmer = ContextTrimmer(self.model_name)

        # Session manager for crash recovery
        self.session_manager = SessionManager()

        # Conversation message history (persisted across state machine nodes)
        self.messages: List[Dict[str, Any]] = []

        # LangGraph Workflow Setup
        workflow = StateGraph(dict)
        workflow.add_node("decompose", self._langgraph_decompose)
        workflow.add_node("execute_task", self._langgraph_execute)
        workflow.add_node("replan", self._langgraph_replan)
        workflow.add_node("synthesize", self._langgraph_synthesize)

        workflow.set_entry_point("decompose")
        workflow.add_edge("decompose", "execute_task")

        def route_execute(state: dict) -> str:
            return state.get("next_node", "synthesize")

        workflow.add_conditional_edges(
            "execute_task",
            route_execute,
            {
                "replan": "replan",
                "synthesize": "synthesize"
            }
        )
        workflow.add_edge("replan", "execute_task")
        workflow.add_edge("synthesize", END)

        self.compiled_graph = workflow.compile()

    def _push_graph_state(self, state_name: str):
        if self.tui_app:
            try:
                self.tui_app.call_from_thread(
                    self.tui_app.update_graph_state,
                    state_name
                )
            except Exception as e:
                logger.debug(f"Failed to push graph state: {e}")

    def _langgraph_decompose(self, state: Dict[str, Any]) -> Dict[str, Any]:
        self._push_graph_state("decompose")
        if "messages" in state:
            self.messages = state["messages"]
        else:
            state["messages"] = self.messages
        res = self.decompose(state)
        res["messages"] = self.messages
        return res

    def _langgraph_execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        self._push_graph_state("execute_task")
        if "messages" in state:
            self.messages = state["messages"]
        else:
            state["messages"] = self.messages
        res = self._node_execute(state)
        res["messages"] = self.messages
        return res

    def _langgraph_replan(self, state: Dict[str, Any]) -> Dict[str, Any]:
        self._push_graph_state("replan")
        if "messages" in state:
            self.messages = state["messages"]
        else:
            state["messages"] = self.messages
        res = self._node_replan(state)
        res["messages"] = self.messages
        return res

    def _langgraph_synthesize(self, state: Dict[str, Any]) -> Dict[str, Any]:
        self._push_graph_state("synthesize")
        if "messages" in state:
            self.messages = state["messages"]
        else:
            state["messages"] = self.messages
        res = self.synthesize(state)
        res["messages"] = self.messages
        return res

    # ── Streaming LLM Completion ──────────────────────────────────────

    def _stream_completion(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict]] = None,
        mock_response: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute LLM completion with streaming, thought interception, and live telemetry.

        Intercepts <thought>...</thought> tags in streamed content and emits
        reasoning_chunk events. Tracks token usage incrementally.

        Returns a dict matching LiteLLM ModelResponse structure:
            {"content": str, "usage": {"prompt_tokens": int, ...}, "tool_calls": list}
        """
        accumulated_content = ""
        thought_buffer = ""
        in_thought = False
        stream_token_count = 0
        tool_calls_accum: List[Dict[str, Any]] = []

        # Track tool call assembly across chunks
        tc_index_map: Dict[int, Dict[str, Any]] = {}

        try:
            kwargs: Dict[str, Any] = {
                "model": self.model_name,
                "messages": messages,
                "stream": True,
            }
            if tools:
                kwargs["tools"] = tools
            if mock_response:
                kwargs["mock_response"] = mock_response

            from litellm import completion
            response_stream = completion(**kwargs)

            for chunk in response_stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta is None:
                    continue

                # ── Content token streaming ──
                chunk_content = getattr(delta, "content", None) or ""
                if chunk_content:
                    accumulated_content += chunk_content

                    # Estimate tokens for this chunk
                    chunk_tokens = max(1, len(chunk_content) // 4)
                    stream_token_count += chunk_tokens

                    # Emit incremental telemetry
                    self._push_telemetry_update(self.model_name, chunk_tokens)

                    # ── Thought tag interception ──
                    # Detect opening <thought> tag
                    if "<thought>" in accumulated_content and not in_thought:
                        in_thought = True
                        thought_buffer = ""

                    if in_thought:
                        thought_buffer += chunk_content

                        # Check for closing tag
                        if "</thought>" in thought_buffer:
                            # Extract thought content
                            match = re.search(
                                r"<thought>(.*?)</thought>",
                                accumulated_content,
                                re.DOTALL,
                            )
                            if match:
                                self._push_reasoning_chunk(match.group(1).strip())
                            in_thought = False
                            thought_buffer = ""

                # ── Tool call delta assembly ──
                tc_deltas = getattr(delta, "tool_calls", None) or []
                for tc_delta in tc_deltas:
                    idx = tc_delta.index if tc_delta.index is not None else 0
                    if idx not in tc_index_map:
                        tc_index_map[idx] = {
                            "id": getattr(tc_delta, "id", None) or "",
                            "type": "function",
                            "function": {"name": "", "arguments": ""},
                        }
                    tc_entry = tc_index_map[idx]

                    if tc_delta.id:
                        tc_entry["id"] = tc_delta.id
                    fn = getattr(tc_delta, "function", None)
                    if fn:
                        if getattr(fn, "name", None):
                            tc_entry["function"]["name"] += fn.name
                        if getattr(fn, "arguments", None):
                            tc_entry["function"]["arguments"] += fn.arguments

                # ── Per-chunk usage (some providers include it) ──
                chunk_usage = getattr(chunk, "usage", None)
                if chunk_usage and hasattr(chunk_usage, "total_tokens"):
                    # Provider gave exact counts — prefer over estimate
                    pass

        except Exception as e:
            logger.error(f"Streaming completion failed: {e}")
            # Fallback: return what we accumulated
            self._push_telemetry_update(self.model_name, 50)
            return {
                "content": accumulated_content or f"[Stream error: {e}]",
                "usage": {
                    "prompt_tokens": 0,
                    "completion_tokens": stream_token_count,
                    "total_tokens": stream_token_count,
                },
                "tool_calls": [],
            }

        # Finalize tool calls
        if tc_index_map:
            tool_calls_accum = [
                tc_index_map[k] for k in sorted(tc_index_map.keys())
            ]

        # Handle any remaining unclosed thought tag
        if in_thought and thought_buffer:
            self._push_reasoning_chunk(
                thought_buffer.replace("<thought>", "").strip()
            )

        return {
            "content": accumulated_content,
            "usage": {
                "prompt_tokens": 0,  # Not available from stream chunks
                "completion_tokens": stream_token_count,
                "total_tokens": stream_token_count,
            },
            "tool_calls": tool_calls_accum,
        }

    # ── State Machine Nodes ───────────────────────────────────────────

    def decompose(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Decompose node: Generates plan mapping to tools using LiteLLM."""
        if "plan" in state:
            logger.info("Resuming with existing plan, skipping decompose")
            # Reset incomplete tasks to pending for re-execution
            for task in state.get("plan", []):
                if task.get("status") == "running":
                    task["status"] = "pending"
            return state
        system_prompt = {
            "role": "system",
            "content": (
                "You are the planner. You are an autonomous execution agent, NOT an informational assistant. "
                "Never explain tool limitations, paths, or missing configuration keys to the user as a final answer. "
                "Every task generated in the Task List MUST be a concrete, active tool execution step (e.g., 'write_file', 'execute_bash'). "
                "Never generate meta-tasks or passive steps like 'Verify support', 'Check feasibility', 'Confirm environment', or 'Address API keys'. "
                "If the user asks to write and run code in any language (C++, Python, Bash), the task list must explicitly look like: "
                "1. write_file (save source code), 2. execute_bash (compile/run the code), 3. read_file/output results.\n\n"
                "Constraint: You MUST output a JSON array of tasks. "
                "Each task MUST explicitly identify the tool to be used "
                "and its arguments. Do NOT generate granular text plans "
                "without tool mappings."
            ),
        }
        user_query = {
            "role": "user",
            "content": state.get(
                "user_query",
                "Analyze the vault and execute pending tasks.",
            ),
        }

        # Initialize conversation history
        self.messages = [system_prompt, user_query]

        logger.info(f"Calling LiteLLM model {self.model_name} with custom tools.")

        # Apply context trimming before LLM call
        active_status = self._format_active_task_status(state)
        trimmed = self.trimmer.trim_messages(self.messages, active_status)

        response = self._stream_completion(
            messages=trimmed,
            tools=TIER_1_TOOLS,
            mock_response="Mock tasks decomposition using LiteLLM",
        )

        # Track assistant response in history
        self.messages.append({
            "role": "assistant",
            "content": response["content"],
        })

        if "history" not in state:
            state["history"] = []

        state["plan"] = [
            {"task_id": "1", "tool": "list_vault", "status": "pending"},
            {"task_id": "2", "tool": "execute_bash", "status": "pending", "fail_mock": True},
        ]
        return state

    def _node_execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Execute node: Runs tasks with Pydantic validation and event-driven UI updates."""
        plan = state.get("plan", [])

        for task in plan:
            if task["status"] in ("completed", "failed❌"):
                continue

            task["status"] = "running"
            self._push_ui_update(task)

            logger.info(f"Executing tool {task['tool']}")
            time.sleep(0.5)

            # ── Pydantic Argument Validation ──
            raw_args = task.get("args", {})
            validation_attempts = 0

            while validation_attempts < MAX_VALIDATION_RETRIES:
                is_valid, result = validate_tool_args(task["tool"], raw_args)

                if is_valid:
                    # result is the validated args dict
                    task["validated_args"] = result
                    break

                # Validation failed — feed error back for self-correction
                validation_attempts += 1
                error_msg = result  # Structured error string

                logger.warning(
                    f"Validation attempt {validation_attempts}/{MAX_VALIDATION_RETRIES} "
                    f"failed for task {task['task_id']}: {error_msg}"
                )

                state["history"].append(
                    f"[Validation Error] Task {task['task_id']} ({task['tool']}), "
                    f"attempt {validation_attempts}: {error_msg}"
                )

                # Inject correction feedback into conversation for LLM self-correction
                correction_msg = {
                    "role": "user",
                    "content": (
                        f"Tool argument validation failed for '{task['tool']}':\n"
                        f"{error_msg}\n\n"
                        f"Please fix the arguments and retry."
                    ),
                }
                self.messages.append(correction_msg)

                # Re-call LLM for corrected arguments
                active_status = self._format_active_task_status(state)
                trimmed = self.trimmer.trim_messages(self.messages, active_status)

                correction_response = self._stream_completion(
                    messages=trimmed,
                    tools=TIER_1_TOOLS,
                    mock_response=json.dumps({"path": "/corrected/path"}),
                )

                self.messages.append({
                    "role": "assistant",
                    "content": correction_response["content"],
                })

                # Try to extract corrected args from response
                try:
                    corrected = json.loads(correction_response["content"])
                    if isinstance(corrected, dict):
                        raw_args = corrected
                except (json.JSONDecodeError, TypeError):
                    # If LLM didn't return valid JSON, use the mock
                    raw_args = task.get("args", {})

            else:
                # Exhausted retries — hard-fail this task
                task["status"] = "failed❌"
                self._push_ui_update(task)
                state["history"].append(
                    f"Task {task['task_id']} hard-failed: exceeded "
                    f"{MAX_VALIDATION_RETRIES} validation retries"
                )
                state["next_node"] = "replan"
                self._save_checkpoint(state, "validation-failure")
                return state

            # ── Execute the tool ──
            try:
                if task.get("fail_mock"):
                    raise RuntimeError(
                        f"Sandbox constraint violation in {task['tool']}"
                    )

                # Real tool execution routing:
                if task["tool"] == "read_file":
                    validated_args = task.get("validated_args", {})
                    path = validated_args.get("path", "")
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        task["result"] = f.read()
                elif task["tool"] == "write_file":
                    validated_args = task.get("validated_args", {})
                    path = validated_args.get("path", "")
                    content = validated_args.get("content", "")
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(content)
                    task["result"] = "File written successfully."
                else:
                    # fallback mock
                    task["result"] = f"Mock completion for {task['tool']}"

                task["status"] = "completed"
                self._push_ui_update(task)

            except Exception as e:
                task["status"] = "failed❌"
                self._push_ui_update(task)
                error_msg = f"Task {task['task_id']} failed: {str(e)}"
                state["history"].append(error_msg)
                logger.error(error_msg)

                # Add error to conversation history for replan context
                self.messages.append({
                    "role": "tool",
                    "content": f"[Tool Error] {error_msg}",
                })

                state["next_node"] = "replan"
                self._save_checkpoint(state, "tool-failure")
                return state

        # Objective-Driven Goal Validation
        query = state.get("user_query", "")
        if isinstance(query, list):
            query_str = " ".join(part.get("text", "") for part in query if part.get("type") == "text")
        else:
            query_str = str(query)

        query_lower = query_str.lower()
        has_verbs = any(verb in query_lower for verb in ("write", "run", "execute"))
        
        executed_modifications = any(
            t.get("tool") in ("write_file", "execute_bash") and t.get("status") == "completed"
            for t in state.get("plan", [])
        )

        if has_verbs and not executed_modifications:
            logger.warning("Goal validation failed: user requested execution but no write/exec tool was run.")
            error_msg = "Error: You provided an explanation instead of executing the requested actions. You must call the appropriate tools to modify the files and execute the code now."
            
            self.messages.append({
                "role": "user",
                "content": error_msg
            })
            state["history"].append(f"[Validation Failed] {error_msg}")
            
            state["next_node"] = "replan"
            self._save_checkpoint(state, "validation-failed")
            return state

        state["next_node"] = "synthesize"
        self._save_checkpoint(state, "execution-complete")
        return state

    def _node_replan(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Replan node: Triggered on tool failure."""
        logger.info("Replanning based on failure history...")
        time.sleep(0.5)

        # Build replan prompt with failure context
        replan_msg = {
            "role": "user",
            "content": (
                "Replan the failed tasks. Failure history:\n"
                + "\n".join(state.get("history", [])[-5:])
            ),
        }
        self.messages.append(replan_msg)

        # Trim context before LLM call
        active_status = self._format_active_task_status(state)
        trimmed = self.trimmer.trim_messages(self.messages, active_status)

        response = self._stream_completion(
            messages=trimmed,
            mock_response="Mock replanning response",
        )

        self.messages.append({
            "role": "assistant",
            "content": response["content"],
        })

        state["history"].append("Replanning complete. Selected backup tool.")
        state["next_node"] = "synthesize"
        self._save_checkpoint(state, "replan-complete")
        return state

    def synthesize(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Synthesize node: Finalizes output."""
        state["final_result"] = "Execution complete"
        self._save_checkpoint(state, "final")
        return state

    # ── UI / Event Helpers ────────────────────────────────────────────

    def _push_ui_update(self, task: Dict[str, Any]):
        if self.ui_queue:
            self.ui_queue.put({
                "type": "sidebar",
                "task_id": task["task_id"],
                "status": task["status"],
                "tool": task["tool"],
            })
        elif self.tui_app:
            self.tui_app.update_sidebar(
                task["task_id"], task["status"], task["tool"]
            )

    def _push_telemetry_update(self, model: str, tokens: int):
        if self.ui_queue:
            self.ui_queue.put({
                "type": "telemetry",
                "model": model,
                "tokens": tokens,
            })
        elif self.tui_app:
            self.tui_app.update_llm_metadata(model, tokens)

    def _push_reasoning_chunk(self, content: str):
        """Emit a reasoning chunk event for the TUI reasoning panel."""
        if self.ui_queue:
            self.ui_queue.put({
                "type": "reasoning_chunk",
                "content": content,
            })
        logger.debug(f"Reasoning: {content[:80]}...")

    # ── Session Persistence ───────────────────────────────────────────

    def _save_checkpoint(self, state: Dict[str, Any], label: str):
        """Auto-save session state for crash recovery."""
        try:
            # Include message history in saved state for full resume
            state["_messages"] = self.messages
            self.session_manager.save_session(state, label=label)
        except Exception as e:
            logger.error(f"Failed to save checkpoint '{label}': {e}")

    def _format_active_task_status(self, state: Dict[str, Any]) -> Optional[str]:
        """Format current active task info for context trimmer pinning."""
        plan = state.get("plan", [])
        running = [t for t in plan if t.get("status") == "running"]
        if not running:
            return None

        lines = ["Currently executing tasks:"]
        for t in running:
            lines.append(
                f"  - Task {t['task_id']}: {t['tool']} [{t['status']}]"
            )
        return "\n".join(lines)

    # ── Main Execution Loop ───────────────────────────────────────────

    def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Run the orchestrator state machine using compiled LangGraph."""
        # Restore message history from resumed session if available
        if "_messages" in state:
            self.messages = state.pop("_messages")
            logger.info(
                f"Restored {len(self.messages)} messages from resumed session"
            )

        initial_state = dict(state)
        initial_state["messages"] = self.messages
        if "history" not in initial_state:
            initial_state["history"] = []

        # Run compiled LangGraph
        final_state = self.compiled_graph.invoke(initial_state)
        return final_state
