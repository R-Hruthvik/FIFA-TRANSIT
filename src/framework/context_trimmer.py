"""
Token Context Trimmer — sliding-window message pruner for LiteLLM conversations.

Pins: system prompt (index 0), initial user query (index 1), active task status.
Trims: old tool-output and assistant turns when total tokens exceed 70% of model context.
Always preserves the latest 3 trimmable turns.
"""

import logging
import re
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Known context window sizes (max tokens) per model prefix.
# LiteLLM model strings use "provider/model" format.
MODEL_CONTEXT_LIMITS: Dict[str, int] = {
    "openai/gpt-4o": 128_000,
    "openai/gpt-4o-mini": 128_000,
    "openai/gpt-4-turbo": 128_000,
    "openai/gpt-4": 8_192,
    "openai/gpt-3.5-turbo": 16_385,
    "anthropic/claude-3-opus": 200_000,
    "anthropic/claude-3-sonnet": 200_000,
    "anthropic/claude-3-haiku": 200_000,
    "anthropic/claude-3.5-sonnet": 200_000,
    "gemini/gemini-pro": 1_000_000,
    "gemini/gemini-1.5-pro": 1_000_000,
    "gemini/gemini-2.0-flash": 1_000_000,
}

DEFAULT_CONTEXT_LIMIT = 8_192
TRIM_THRESHOLD_RATIO = 0.70
PRESERVE_TAIL_COUNT = 3  # Always keep latest N trimmable turns


def estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 characters per token.

    Good enough for trimming heuristics. For precise counts,
    swap in litellm.token_counter() or tiktoken.
    """
    if not text:
        return 0
    return max(1, len(text) // 4)


def _estimate_message_tokens(msg: Dict[str, Any]) -> int:
    """Estimate tokens for a single message including role overhead."""
    # ~4 tokens overhead per message (role, delimiters)
    overhead = 4
    content = msg.get("content", "")
    if isinstance(content, list):
        # Multi-part content (vision models etc.)
        content = " ".join(
            part.get("text", "") for part in content if isinstance(part, dict)
        )
    return overhead + estimate_tokens(str(content))


def _get_context_limit(model: str) -> int:
    """Resolve context window size for a model string."""
    # Exact match first
    if model in MODEL_CONTEXT_LIMITS:
        return MODEL_CONTEXT_LIMITS[model]

    # Prefix match (e.g., "openai/gpt-4o-2024-08-06" matches "openai/gpt-4o")
    for prefix, limit in sorted(
        MODEL_CONTEXT_LIMITS.items(), key=lambda kv: -len(kv[0])
    ):
        if model.startswith(prefix):
            return limit

    logger.warning(
        f"Unknown model '{model}', using default context limit {DEFAULT_CONTEXT_LIMIT}"
    )
    return DEFAULT_CONTEXT_LIMIT


def _summarize_message(msg: Dict[str, Any]) -> Dict[str, Any]:
    """Compress a message into a short summary placeholder."""
    role = msg.get("role", "assistant")
    content = str(msg.get("content", ""))

    # Truncate to first 120 chars + indicator
    if len(content) > 120:
        summary = content[:120] + "... [trimmed]"
    else:
        summary = content

    return {
        "role": role,
        "content": f"[Context trimmed] {summary}",
    }


class ContextTrimmer:
    """Manages message history trimming to stay within model context windows."""

    def __init__(self, model: str):
        self.model = model
        self.context_limit = _get_context_limit(model)
        self.token_threshold = int(self.context_limit * TRIM_THRESHOLD_RATIO)

    def trim_messages(
        self,
        messages: List[Dict[str, Any]],
        active_task_status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Trim message history to stay within context budget.

        Pinned messages (never trimmed):
          - messages[0]: system prompt
          - messages[1]: initial user query
          - active task status message (if provided, injected as last pinned)

        Trimmable messages: everything else, with the last PRESERVE_TAIL_COUNT
        turns always kept intact.

        Strategy:
          1. Drop tool-output turns first (oldest → newest)
          2. Summarize old assistant turns
          3. Never touch pinned or tail-preserved messages
        """
        if len(messages) <= 2:
            return list(messages)

        # --- Partition into pinned vs trimmable ---
        pinned: List[Dict[str, Any]] = []
        trimmable: List[Dict[str, Any]] = []

        for i, msg in enumerate(messages):
            if i < 2:
                # System prompt + initial user query
                pinned.append(msg)
            else:
                trimmable.append(msg)

        # Inject active task status as a pinned system message if provided
        task_status_msg = None
        if active_task_status:
            task_status_msg = {
                "role": "system",
                "content": f"[Active Task Status] {active_task_status}",
            }

        # --- Check if trimming needed ---
        total_tokens = sum(_estimate_message_tokens(m) for m in pinned)
        if task_status_msg:
            total_tokens += _estimate_message_tokens(task_status_msg)
        total_tokens += sum(_estimate_message_tokens(m) for m in trimmable)

        if total_tokens <= self.token_threshold:
            # Under budget — just inject task status and return
            result = list(pinned)
            if task_status_msg:
                result.append(task_status_msg)
            result.extend(trimmable)
            return result

        logger.info(
            f"Context trimming triggered: {total_tokens} tokens "
            f"exceeds {self.token_threshold} threshold "
            f"(limit: {self.context_limit})"
        )

        # --- Preserve tail ---
        if len(trimmable) > PRESERVE_TAIL_COUNT:
            tail = trimmable[-PRESERVE_TAIL_COUNT:]
            candidates = trimmable[:-PRESERVE_TAIL_COUNT]
        else:
            # Not enough messages to trim meaningfully
            tail = trimmable
            candidates = []

        # --- Phase 1: Drop tool-output turns ---
        surviving = []
        for i, msg in enumerate(candidates):
            if msg.get("role") == "tool":
                saved = _estimate_message_tokens(msg)
                total_tokens -= saved
                logger.debug(f"Dropped tool output, saved ~{saved} tokens")
                if total_tokens <= self.token_threshold:
                    # Keep remaining candidates as-is
                    surviving.extend(candidates[i + 1 :])
                    break
            else:
                surviving.append(msg)
        else:
            # Exhausted tool outputs, move to phase 2
            pass

        # --- Phase 2: Summarize old assistant turns ---
        if total_tokens > self.token_threshold:
            compressed = []
            for i, msg in enumerate(surviving):
                if msg.get("role") == "assistant":
                    original_tokens = _estimate_message_tokens(msg)
                    summarized = _summarize_message(msg)
                    new_tokens = _estimate_message_tokens(summarized)
                    total_tokens -= original_tokens - new_tokens
                    compressed.append(summarized)
                    logger.debug(
                        f"Summarized assistant turn, saved ~{original_tokens - new_tokens} tokens"
                    )
                else:
                    compressed.append(msg)

                if total_tokens <= self.token_threshold:
                    # Keep rest as-is
                    compressed.extend(surviving[i + 1 :])
                    break
            surviving = compressed

        # --- Phase 3: Hard-drop remaining oldest if still over ---
        if total_tokens > self.token_threshold:
            while surviving and total_tokens > self.token_threshold:
                dropped = surviving.pop(0)
                total_tokens -= _estimate_message_tokens(dropped)
                logger.debug("Hard-dropped oldest trimmable message")

        # --- Reassemble ---
        result = list(pinned)
        if task_status_msg:
            result.append(task_status_msg)
        result.extend(surviving)
        result.extend(tail)

        logger.info(
            f"Context trimmed: {len(messages)} → {len(result)} messages, "
            f"~{total_tokens} tokens"
        )
        return result
