from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from os import getenv
import sys

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = getenv("DB_CONNECTION_STRING")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)
migrate = Migrate(app, db)


class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True, index=True)
    title = db.Column(db.String, nullable=False, unique=True)
    authorEmail = db.Column(db.String, nullable=False)
    content = db.Column(db.String)

    def __repr__(self):
        return f"Post <{self.title}>"


@app.route("/posts")
def get_posts():
    try:
        return jsonify(
            {
                "message": "success",
                "data": [
                    {
                        "title": post.title,
                        "authorEmail": post.authorEmail,
                        "content": post.content,
                    }
                    for post in Post.query.all()
                ],
            }
        )
    except Exception as err:
        # If anything goes wrong, log the error.
        # You can later access the log data in the AWS console.
        print(str(err), file=sys.stderr)
        return jsonify({"message": "error", "error": str(err)})


@app.route("/post", methods=["POST"])
def create_post():
    try:
        data = request.get_json()
        if not "title" in data or not "authorEmail" in data:
            raise Exception('"title" and "authorEmail" are required.')
        post = Post(
            authorEmail=data["authorEmail"],
            title=data["title"],
            content=data["content"] if "content" in data else None,
        )
        db.session.add(post)
        db.session.commit()
        return jsonify(
            {
                "message": "success",
                "data": {
                    "title": post.title,
                    "authorEmail": post.authorEmail,
                    "content": post.content,
                },
            }
        )
    except Exception as err:
        print(str(err), file=sys.stderr)
        return jsonify({"message": "error", "error": str(err)})


if __name__ == "__main__":
    from waitress import serve
    port=getenv("PORT", 3000)
    serve(app, host="0.0.0.0", port=port)
