import importlib.util

import idna


def handler(event, context):
    return {
        "domain": idna.encode(event["domain"]).decode(),
        "devAbsent": importlib.util.find_spec("pytest") is None,
    }
