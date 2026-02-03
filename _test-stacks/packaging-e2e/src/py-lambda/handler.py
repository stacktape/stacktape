import requests

def handler(_event, _context):
    # Use requests to verify dependency was packaged
    version = requests.__version__
    return {"statusCode": 200, "body": f"py ok - requests v{version}"}
