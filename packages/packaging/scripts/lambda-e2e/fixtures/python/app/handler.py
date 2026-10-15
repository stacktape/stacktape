import importlib.metadata
import importlib.util
from pathlib import Path

import idna
import sniffio
from markupsafe import escape, _speedups


def handler(event, context):
    return {
        "escaped": str(escape(event["text"])),
        "domain": idna.encode("münich").decode(),
        "native": Path(_speedups.__file__).name.endswith(".so"),
        "version": importlib.metadata.version("markupsafe"),
        "group": sniffio.__version__,
        "devAbsent": importlib.util.find_spec("pytest") is None,
        "resource": Path(__file__).with_name("message.txt").read_text().strip(),
    }
