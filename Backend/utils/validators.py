from typing import Any, Dict, List
from .constants import ALLOWED_DIFFICULTIES, DEFAULT_FLASHCARD_METADATA

def _as_int(value, default=0):
    try:
        i = int(value)
        return i if i >= 0 else default
    except Exception:
        return default

def validate_flashcard_metadata(payload: Dict[str, Any]) -> Dict[str, Any]:
    # ... validation logic here ...
    return meta

def apply_default_flashcard_metadata(doc: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(doc)
    out.setdefault("topic_tags", [])
    out.setdefault("difficulty", "medium")
    out.setdefault("time_taken", 0)
    return out
