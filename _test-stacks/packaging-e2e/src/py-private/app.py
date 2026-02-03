import os
import flask

app = flask.Flask(__name__)

@app.route("/")
def hello():
    return f"private ok - flask v{flask.__version__}"

if __name__ == "__main__":
    port = int(os.getenv("PORT", "3002"))
    app.run(host="0.0.0.0", port=port)
