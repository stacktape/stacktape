import importlib.util


def handler(event, context):
    modules = ["idna", "iniconfig", "markupsafe", "sniffio", "charset_normalizer"]
    installed = {name: importlib.util.find_spec(name) is not None for name in modules}
    if installed["markupsafe"]:
        from markupsafe import _speedups
        installed["native"] = _speedups.__file__.startswith("/var/task/") and _speedups.__file__.endswith(".so")
    return installed
