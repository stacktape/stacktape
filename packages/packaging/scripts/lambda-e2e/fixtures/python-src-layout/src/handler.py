import idna


def handler(event, context):
    return {"module": __name__, "domain": idna.encode(event["domain"]).decode()}
