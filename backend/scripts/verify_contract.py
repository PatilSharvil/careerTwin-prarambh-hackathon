"""Contract verification runner forwarder.

Delegates to root scripts/verify_contract.py or runs self-contained.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Add repo root to sys.path and run verify_contract
repo_root = Path(__file__).resolve().parent.parent.parent
scripts_dir = repo_root / "scripts"
if str(scripts_dir) not in sys.path:
    sys.path.insert(0, str(scripts_dir))

from verify_contract import main

if __name__ == "__main__":
    main()
