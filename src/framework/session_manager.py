"""
Session Manager — save/load agent session state for resume capability.

Persists OrchestratorState to timestamped markdown files in vault/sessions/.
Format: YAML frontmatter (metadata) + fenced JSON block (full state).
Supports listing available sessions and loading the most recent one.
"""

import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_SESSION_DIR = "vault/sessions"


def _ensure_session_dir(session_dir: str) -> Path:
    """Create session directory if it doesn't exist."""
    path = Path(session_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _generate_session_filename() -> str:
    """Generate timestamped session filename."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return f"session_{ts}.md"


def _serialize_state(state: Dict[str, Any]) -> str:
    """Serialize state dict to JSON, handling non-serializable values."""

    def _default(obj: Any) -> Any:
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, set):
            return list(obj)
        return str(obj)

    return json.dumps(state, indent=2, default=_default)


def _compute_session_summary(state: Dict[str, Any]) -> Dict[str, Any]:
    """Extract summary metadata from state for YAML frontmatter."""
    plan = state.get("plan", [])

    completed = sum(1 for t in plan if t.get("status") == "completed")
    failed = sum(1 for t in plan if "failed" in str(t.get("status", "")))
    pending = sum(
        1 for t in plan if t.get("status") in ("pending", "running")
    )

    return {
        "total_tasks": len(plan),
        "completed": completed,
        "failed": failed,
        "pending": pending,
        "has_incomplete_work": pending > 0 or failed > 0,
        "next_node": state.get("next_node", "unknown"),
    }


class SessionManager:
    """Manages session persistence for crash recovery and resume."""

    def __init__(self, session_dir: str = DEFAULT_SESSION_DIR):
        self.session_dir = session_dir
        self._dir_path = _ensure_session_dir(session_dir)

    def save_session(
        self,
        state: Dict[str, Any],
        label: Optional[str] = None,
    ) -> str:
        """Save current orchestrator state to a session file.

        Args:
            state: The full OrchestratorState dict.
            label: Optional human-readable label for this checkpoint.

        Returns:
            Path to the saved session file.
        """
        filename = _generate_session_filename()
        filepath = self._dir_path / filename

        summary = _compute_session_summary(state)
        timestamp = datetime.now(timezone.utc).isoformat()

        # Build markdown with YAML frontmatter
        frontmatter_lines = [
            "---",
            f"timestamp: {timestamp}",
            f"label: {label or 'auto-checkpoint'}",
            f"total_tasks: {summary['total_tasks']}",
            f"completed: {summary['completed']}",
            f"failed: {summary['failed']}",
            f"pending: {summary['pending']}",
            f"has_incomplete_work: {summary['has_incomplete_work']}",
            f"next_node: {summary['next_node']}",
            "---",
        ]

        state_json = _serialize_state(state)

        content_lines = [
            *frontmatter_lines,
            "",
            f"# Session: {label or 'Auto-Checkpoint'}",
            "",
            f"Saved at: {timestamp}",
            "",
            "## Task Summary",
            "",
        ]

        plan = state.get("plan", [])
        for task in plan:
            status_icon = {
                "completed": "✅",
                "pending": "⏳",
                "running": "🔄",
            }.get(task.get("status", ""), "❌")
            content_lines.append(
                f"- {status_icon} Task {task.get('task_id', '?')}: "
                f"`{task.get('tool', 'unknown')}` — {task.get('status', 'unknown')}"
            )

        content_lines.extend(
            [
                "",
                "## History",
                "",
            ]
        )
        for entry in state.get("history", []):
            content_lines.append(f"- {entry}")

        content_lines.extend(
            [
                "",
                "## Full State",
                "",
                "```json",
                state_json,
                "```",
                "",
            ]
        )

        filepath.write_text("\n".join(content_lines), encoding="utf-8")
        logger.info(f"Session saved: {filepath}")
        return str(filepath)

    def load_latest_session(self) -> Optional[Dict[str, Any]]:
        """Load the most recent session state.

        Returns:
            Parsed state dict, or None if no sessions exist.
        """
        sessions = self.list_sessions()
        if not sessions:
            logger.warning("No sessions found to resume from")
            return None

        latest = sessions[-1]  # Sorted by timestamp, last = newest
        return self._load_session_file(latest["path"])

    def load_session(self, filepath: str) -> Optional[Dict[str, Any]]:
        """Load a specific session file by path."""
        return self._load_session_file(filepath)

    def _load_session_file(self, filepath: str) -> Optional[Dict[str, Any]]:
        """Parse a session markdown file and extract the state dict."""
        try:
            content = Path(filepath).read_text(encoding="utf-8")
        except FileNotFoundError:
            logger.error(f"Session file not found: {filepath}")
            return None
        except Exception as e:
            logger.error(f"Failed to read session file {filepath}: {e}")
            return None

        # Extract JSON from fenced code block
        json_match = re.search(
            r"```json\s*\n(.*?)\n\s*```", content, re.DOTALL
        )
        if not json_match:
            logger.error(f"No JSON state block found in {filepath}")
            return None

        try:
            state = json.loads(json_match.group(1))
            logger.info(
                f"Session loaded from {filepath}: "
                f"{len(state.get('plan', []))} tasks"
            )
            return state
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse state JSON in {filepath}: {e}")
            return None

    def list_sessions(self) -> List[Dict[str, Any]]:
        """List all available session files, sorted by timestamp (oldest first).

        Returns:
            List of dicts with 'path', 'filename', 'timestamp' keys.
        """
        sessions = []
        pattern = re.compile(r"^session_(\d{8}_\d{6})\.md$")

        for entry in sorted(self._dir_path.iterdir()):
            if not entry.is_file():
                continue
            match = pattern.match(entry.name)
            if match:
                ts_str = match.group(1)
                try:
                    ts = datetime.strptime(ts_str, "%Y%m%d_%H%M%S").replace(
                        tzinfo=timezone.utc
                    )
                except ValueError:
                    ts = None

                sessions.append(
                    {
                        "path": str(entry),
                        "filename": entry.name,
                        "timestamp": ts.isoformat() if ts else ts_str,
                    }
                )

        return sessions

    def get_resume_summary(self) -> Optional[str]:
        """Get a human-readable summary of the latest resumable session."""
        latest_state = self.load_latest_session()
        if latest_state is None:
            return None

        summary = _compute_session_summary(latest_state)
        sessions = self.list_sessions()
        latest_file = sessions[-1] if sessions else {}

        lines = [
            f"📂 Session: {latest_file.get('filename', 'unknown')}",
            f"   Timestamp: {latest_file.get('timestamp', 'unknown')}",
            f"   Tasks: {summary['total_tasks']} total, "
            f"{summary['completed']} done, "
            f"{summary['failed']} failed, "
            f"{summary['pending']} pending",
            f"   Next node: {summary['next_node']}",
        ]
        return "\n".join(lines)
