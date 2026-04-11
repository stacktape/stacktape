def handler(event, context):
    mode = (event or {}).get("queryStringParameters", {})
    if mode and mode.get("mode") == "value-error":
        raise ValueError("Python ValueError test")
    raise RuntimeError("Python RuntimeError from Lambda")
