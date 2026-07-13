"""
Agentic Framework TUI — main entry point.

Upgraded to rich, async-driven multimodal AI operating system using Textual and LangGraph.
"""

import argparse
import base64
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Textual imports
from textual.app import App, ComposeResult
from textual.containers import Horizontal, Vertical
from textual.widgets import Header, Input, Button, RichLog, Tree, Static
from textual.reactive import reactive
from textual import work
from textual_fspicker import FileOpen
from textual_image.renderable import Image as TextualImage

# Set up logging to file instead of stdout/stderr to avoid TUI corruption
Path("vault/sessions").mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    handlers=[
        logging.FileHandler("vault/sessions/agent_tui.log", encoding="utf-8"),
    ]
)
logger = logging.getLogger(__name__)


class AgentTUIApp(App):
    CSS = """
    Screen {
        background: #1e1e2e;
        color: #cdd6f4;
        font-family: "Courier New", monospace;
    }

    #main-container {
        height: 1fr;
        width: 100%;
    }

    #left-pane {
        width: 25%;
        height: 100%;
        border-right: thin #45475a;
        background: #181825;
    }

    #right-pane {
        width: 75%;
        height: 100%;
        background: #1e1e2e;
    }

    #task-tree {
        background: #181825;
        color: #a6e3a1;
        border: none;
        height: 1fr;
    }

    #chat-log {
        background: #1e1e2e;
        color: #cdd6f4;
        border: none;
        height: 1fr;
        padding: 1;
    }

    #input-container {
        height: auto;
        padding: 1;
        border-top: thin #45475a;
        background: #11111b;
        align: middle;
    }

    #attach-btn {
        width: 16;
        background: #89b4fa;
        color: #11111b;
        border: none;
    }
    
    #attach-btn:hover {
        background: #b4befe;
    }

    #query-input {
        width: 1fr;
        background: #313244;
        color: #cdd6f4;
        border: none;
    }

    #send-btn {
        width: 10;
        background: #a6e3a1;
        color: #11111b;
        border: none;
    }
    
    #send-btn:hover {
        background: #94e2d5;
    }

    #status-bar {
        height: 1;
        background: #11111b;
        color: #f5c2e7;
        border-top: thin #45475a;
        padding: 0 1;
    }
    """

    BINDINGS = [
        ("ctrl+b", "toggle_sidebar", "Toggle Sidebar"),
        ("ctrl+o", "attach_file", "Attach File"),
        ("ctrl+q", "quit", "Quit"),
    ]

    model_name = reactive("Gemini 3.5 Flash")
    total_tokens = reactive(0)
    graph_state = reactive("idle")
    active_status = reactive("Active")

    def __init__(self, args=None, resume_state=None):
        super().__init__()
        self.args = args
        self.resume_state = resume_state
        self.tree_nodes = {}
        self.attached_images = []
        self.attached_files = []
        self.reasoning_lines = []
        self.max_reasoning_lines = 8

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal(id="main-container"):
            with Vertical(id="left-pane"):
                tree = Tree("Execution plan", id="task-tree")
                yield tree
            with Vertical(id="right-pane"):
                yield RichLog(id="chat-log", wrap=True, highlight=True, markup=True)
                with Horizontal(id="input-container"):
                    yield Button("Attach [ctrl+o]", id="attach-btn")
                    yield Input(placeholder="Ask anything...", id="query-input")
                    yield Button("Send", id="send-btn")
        
        # Sticky status bar
        yield Static(self.format_status_bar(), id="status-bar")

    def on_mount(self) -> None:
        # Expand tree root
        tree = self.query_one("#task-tree", Tree)
        tree.root.expand()

        self.log_message("[bold cyan]=== Unified Multimodal AI OS ===[/bold cyan]")
        self.log_message("Press [bold]ctrl+b[/bold] to toggle sidebar, [bold]ctrl+o[/bold] to attach files.")
        
        if self.resume_state:
            self.log_message("[bold green]Session state loaded for resume.[/bold green]")
            plan = self.resume_state.get("plan", [])
            for task in plan:
                self.update_sidebar(task["task_id"], task["status"], task["tool"])

    def format_status_bar(self) -> str:
        model_val = self.model_name
        truncated_model = (
            (model_val[:12] + "...")
            if len(model_val) > 15
            else model_val
        )

        model_str = f"Model: {truncated_model:<15}"
        tokens_str = f"Tokens: {self.total_tokens:<8}"
        state_str = f"Graph: {self.graph_state:<12}"
        status_str = f"Status: {self.active_status:<10}"

        return f"| {model_str} | {tokens_str} | {state_str} | {status_str} |"

    def watch_model_name(self, old: str, new: str) -> None:
        self.update_status_bar()

    def watch_total_tokens(self, old: int, new: int) -> None:
        self.update_status_bar()

    def watch_graph_state(self, old: str, new: str) -> None:
        self.update_status_bar()

    def watch_active_status(self, old: str, new: str) -> None:
        self.update_status_bar()

    def update_status_bar(self) -> None:
        try:
            status_bar = self.query_one("#status-bar", Static)
            status_bar.update(self.format_status_bar())
        except Exception:
            pass

    def log_message(self, message: str) -> None:
        chat_log = self.query_one("#chat-log", RichLog)
        chat_log.write(message)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "attach-btn":
            self.action_attach_file()
        elif event.button.id == "send-btn":
            self.submit_query()

    def on_input_submitted(self, event: Input.Submitted) -> None:
        if event.input.id == "query-input":
            self.submit_query()

    def action_attach_file(self) -> None:
        self.push_screen(FileOpen("."), self.handle_file_selected)

    def handle_file_selected(self, selected_path: str | None) -> None:
        if not selected_path:
            return
        
        path_str = str(selected_path)
        self.log_message(f"[bold cyan]Selected file:[/bold cyan] {path_str}")
        
        ext = path_str.lower()
        if ext.endswith(('.png', '.jpg', '.jpeg')):
            try:
                # Render visual thumbnail preview in chat log using textual-image
                img_renderable = TextualImage(path_str, width="30%", height="auto")
                self.query_one("#chat-log", RichLog).write(img_renderable)
            except Exception as e:
                self.log_message(f"[red]Error rendering image preview: {e}[/red]")
            
            # Format image data as base64 payload
            try:
                with open(path_str, "rb") as image_file:
                    encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
                
                mime = "image/png" if ext.endswith('.png') else "image/jpeg"
                self.attached_images.append({
                    "mime_type": mime,
                    "base64_data": encoded_string
                })
                self.log_message("[green]Image attached as base64 payload.[/green]")
            except Exception as e:
                self.log_message(f"[red]Error encoding image to base64: {e}[/red]")
        else:
            self.attached_files.append(path_str)
            self.log_message(f"[green]File attached to prompt context: {path_str}[/green]")

    def action_toggle_sidebar(self) -> None:
        left_pane = self.query_one("#left-pane")
        left_pane.display = not left_pane.display

    def submit_query(self) -> None:
        input_widget = self.query_one("#query-input", Input)
        query_text = input_widget.value.strip()
        if not query_text and not self.attached_images and not self.attached_files:
            return

        # Build query text with text attachments
        for path_str in self.attached_files:
            try:
                with open(path_str, "r", encoding="utf-8", errors="ignore") as f:
                    file_content = f.read()
                query_text += f"\n\n[Attached File: {path_str}]\n{file_content}"
            except Exception as e:
                self.log_message(f"[red]Error loading attached file {path_str}: {e}[/red]")

        # Build query payload
        if self.attached_images:
            content_payload = [{"type": "text", "text": query_text}]
            for img in self.attached_images:
                content_payload.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{img['mime_type']};base64,{img['base64_data']}"
                    }
                })
            query_payload = content_payload
            self.log_message(f"[bold green]User:[/bold green] {query_text} [italic](attached {len(self.attached_images)} image(s))[/italic]")
        else:
            query_payload = query_text
            self.log_message(f"[bold green]User:[/bold green] {query_text}")

        # Reset inputs
        input_widget.value = ""
        self.attached_images = []
        self.attached_files = []

        # Run orchestrator loop safely in a worker thread
        self.active_status = "Active"
        self.log_message("[bold yellow]System: Initiating LangGraph execution worker...[/bold yellow]")
        self.run_orchestrator(query_payload, self.resume_state)

    @work(thread=True)
    def run_orchestrator(self, query_payload: Any, resume_state: Dict[str, Any] = None) -> None:
        from src.framework.orchestrator import Orchestrator
        
        # Reset total tokens
        self.total_tokens = 0
        
        orchestrator = Orchestrator(tui_app=self)
        self.model_name = orchestrator.model_name
        
        state = resume_state if resume_state else {}
        state["user_query"] = query_payload

        try:
            final_state = orchestrator.execute(state)
            self.call_from_thread(self.log_message, f"\n[bold green]Workflow Completed:[/bold green] {final_state.get('final_result', 'Done')}")
            self.call_from_thread(self.set_active_status, "Done")
        except Exception as e:
            self.call_from_thread(self.log_message, f"\n[bold red]Orchestrator Crashed:[/bold red] {e}")
            self.call_from_thread(self.set_active_status, "Failed")

    def set_active_status(self, status: str) -> None:
        self.active_status = status

    def update_sidebar(self, task_id: str, status: str, tool: str) -> None:
        tree = self.query_one("#task-tree", Tree)
        node_id = f"task_{task_id}"
        
        status_colors = {
            "completed": "[green]completed[/green]",
            "running": "[yellow]running[/yellow]",
            "pending": "[blue]pending[/blue]",
            "failed❌": "[red]failed[/red]",
        }
        
        status_display = status_colors.get(status, status)
        node_label = f"Task {task_id}: {tool} ({status_display})"
        
        if node_id in self.tree_nodes:
            node = self.tree_nodes[node_id]
            node.label = node_label
        else:
            node = tree.root.add(node_label, expand=True)
            self.tree_nodes[node_id] = node

    def update_llm_metadata(self, model_name: str, token_count: int) -> None:
        if model_name:
            self.model_name = model_name
        self.total_tokens += token_count

    def update_graph_state(self, state_name: str) -> None:
        self.graph_state = state_name

    def append_reasoning(self, content: str) -> None:
        for line in content.split("\n"):
            stripped = line.strip()
            if stripped:
                self.reasoning_lines.append(stripped)

        if len(self.reasoning_lines) > self.max_reasoning_lines:
            self.reasoning_lines = self.reasoning_lines[-self.max_reasoning_lines :]
        
        self.log_message(f"[italic magenta]💭 {content.strip()}[/italic magenta]")


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Unified Agentic Framework",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume from the most recent saved session in vault/sessions/",
    )
    parser.add_argument(
        "--session-file",
        type=str,
        default=None,
        help="Resume from a specific session file path",
    )
    parser.add_argument(
        "--session-dir",
        type=str,
        default="vault/sessions",
        help="Directory containing session files (default: vault/sessions)",
    )
    return parser.parse_args()


def load_resume_state(args: argparse.Namespace) -> Dict[str, Any] | None:
    """Load session state for resume if requested."""
    if not args.resume and not args.session_file:
        return None

    from src.framework.session_manager import SessionManager

    session_mgr = SessionManager(session_dir=args.session_dir)

    if args.session_file:
        logger.info(f"Resuming from specific session: {args.session_file}")
        state = session_mgr.load_session(args.session_file)
    else:
        summary = session_mgr.get_resume_summary()
        if summary:
            print(f"\n📂 Resuming session:\n{summary}\n")
        state = session_mgr.load_latest_session()

    if state is None:
        print("⚠️  No session found to resume. Starting fresh.")
        return None

    plan = state.get("plan", [])
    completed = sum(1 for t in plan if t.get("status") == "completed")
    pending = sum(
        1 for t in plan if t.get("status") in ("pending", "running")
    )
    print(
        f"✅ Session loaded: {len(plan)} tasks "
        f"({completed} done, {pending} remaining)"
    )
    return state


if __name__ == "__main__":
    args = parse_args()
    resume_state = load_resume_state(args)
    app = AgentTUIApp(args=args, resume_state=resume_state)
    app.run()
