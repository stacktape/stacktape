import importlib.metadata
import importlib.util

import idna


def handler(event, context):
    return {
        "domain": idna.encode(event["domain"]).decode(),
        "version": importlib.metadata.version("idna"),
        "devAbsent": importlib.util.find_spec("pytest") is None,
    }
