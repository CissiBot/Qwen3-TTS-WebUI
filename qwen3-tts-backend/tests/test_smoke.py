import importlib
import sys
from pathlib import Path


def test_backend_entrypoint_imports() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(backend_root))

    main_module = importlib.import_module("main")

    assert getattr(main_module, "app", None) is not None
