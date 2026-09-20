"""Navigator agent package per SPEC §5.2 and §13.3."""
import sys
from pathlib import Path

_backend_root = str(Path(__file__).resolve().parent.parent.parent)
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

from agents.navigator.agent import root_agent

__all__ = ["root_agent"]
