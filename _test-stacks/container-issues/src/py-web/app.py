import os
import flask
import traceback

app = flask.Flask(__name__)


@app.route("/")
def hello():
    return "OK"


@app.route("/error")
def error():
    raise ValueError("Python container ValueError with traceback")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "3000"))
    app.run(host="0.0.0.0", port=port)
