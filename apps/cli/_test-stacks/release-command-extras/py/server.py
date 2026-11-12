import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

RELEASE = 'initial'


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({'release': RELEASE}).encode()
        self.send_response(200)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass


ThreadingHTTPServer(('0.0.0.0', int(os.environ['PORT'])), Handler).serve_forever()
