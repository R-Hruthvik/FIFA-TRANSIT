"""
Pydantic Tool Argument Schemas — validation models for all framework tools.

Each tool's arguments are defined as a Pydantic v2 BaseModel.
The TOOL_VALIDATORS registry maps tool names to their schema classes.
validate_tool_args() provides structured error messages for self-correction.
"""

import logging
from typing import Any, Dict, Optional, Tuple, Union

from pydantic import BaseModel, Field, ValidationError, field_validator

logger = logging.getLogger(__name__)


# ── Tool Argument Models ──────────────────────────────────────────────


class ReadFileArgs(BaseModel):
    """Arguments for the read_file tool."""

    path: str = Field(
        ...,
        min_length=1,
        description="Absolute or relative path to the file to read.",
    )

    @field_validator("path")
    @classmethod
    def path_not_empty_or_whitespace(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("path must not be empty or whitespace-only")
        return v


class WriteFileArgs(BaseModel):
    """Arguments for the write_file tool."""

    path: str = Field(
        ...,
        min_length=1,
        description="Absolute or relative path to write to.",
    )
    content: str = Field(
        ...,
        description="Content to write to the file.",
    )

    @field_validator("path")
    @classmethod
    def path_not_empty_or_whitespace(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("path must not be empty or whitespace-only")
        return v


class ListVaultArgs(BaseModel):
    """Arguments for the list_vault tool (no arguments required)."""

    pass


class ExecuteBashArgs(BaseModel):
    """Arguments for the execute_bash tool."""

    command: str = Field(
        ...,
        min_length=1,
        description="Bash command to execute.",
    )

    @field_validator("command")
    @classmethod
    def command_not_empty_or_whitespace(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("command must not be empty or whitespace-only")
        return v


# ── Validator Registry ────────────────────────────────────────────────

TOOL_VALIDATORS: Dict[str, type[BaseModel]] = {
    "read_file": ReadFileArgs,
    "write_file": WriteFileArgs,
    "list_vault": ListVaultArgs,
    "execute_bash": ExecuteBashArgs,
}


# ── Validation Interface ─────────────────────────────────────────────


def validate_tool_args(
    tool_name: str, raw_args: Dict[str, Any]
) -> Tuple[bool, Union[Dict[str, Any], str]]:
    """Validate tool arguments against their Pydantic schema.

    Returns:
        (True, validated_dict) on success.
        (False, error_message) on validation failure.
        Error message is structured for LLM self-correction:
        includes field names, expected types, and constraint violations.
    """
    validator_cls = TOOL_VALIDATORS.get(tool_name)

    if validator_cls is None:
        logger.warning(f"No validator registered for tool '{tool_name}', passing through")
        return True, raw_args

    try:
        validated = validator_cls.model_validate(raw_args)
        return True, validated.model_dump()

    except ValidationError as e:
        # Format errors for LLM self-correction
        error_lines = [
            f"Tool '{tool_name}' argument validation failed:"
        ]
        for err in e.errors():
            loc = " → ".join(str(l) for l in err["loc"]) if err["loc"] else "(root)"
            error_lines.append(
                f"  • Field '{loc}': {err['msg']} "
                f"(type: {err['type']}, input: {err.get('input', 'N/A')})"
            )

        # Append expected schema for reference
        schema = validator_cls.model_json_schema()
        props = schema.get("properties", {})
        required = schema.get("required", [])
        error_lines.append(f"  Expected schema for '{tool_name}':")
        for prop_name, prop_info in props.items():
            req_marker = " [REQUIRED]" if prop_name in required else ""
            error_lines.append(
                f"    - {prop_name}: {prop_info.get('type', 'any')}{req_marker}"
                f" — {prop_info.get('description', '')}"
            )

        error_msg = "\n".join(error_lines)
        logger.warning(error_msg)
        return False, error_msg


def get_schema_description(tool_name: str) -> Optional[str]:
    """Get human-readable schema description for a tool.

    Useful for injecting schema hints into prompts.
    """
    validator_cls = TOOL_VALIDATORS.get(tool_name)
    if validator_cls is None:
        return None

    schema = validator_cls.model_json_schema()
    props = schema.get("properties", {})
    required = schema.get("required", [])

    lines = [f"Schema for '{tool_name}':"]
    for prop_name, prop_info in props.items():
        req = " [REQUIRED]" if prop_name in required else ""
        lines.append(
            f"  - {prop_name}: {prop_info.get('type', 'any')}{req}"
            f" — {prop_info.get('description', '')}"
        )
    return "\n".join(lines)
