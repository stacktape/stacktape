import os

from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, Column, String, Text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get(
    "STP_MAIN_DATABASE_CONNECTION_STRING", "sqlite:///./dev.db"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class Post(Base):
    __tablename__ = "posts"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(Text)
    author_email = Column(String)


Base.metadata.create_all(bind=engine)

app = FastAPI(title="FastAPI + Postgres on Stacktape")


@app.get("/")
def root():
    return {"message": "FastAPI running on AWS"}


@app.get("/posts")
def get_posts():
    db = SessionLocal()
    try:
        posts = db.query(Post).all()
        return {
            "data": [
                {
                    "id": p.id,
                    "title": p.title,
                    "content": p.content,
                    "authorEmail": p.author_email,
                }
                for p in posts
            ]
        }
    finally:
        db.close()


@app.post("/posts", status_code=201)
def create_post(post: dict):
    import uuid

    db = SessionLocal()
    try:
        new_post = Post(
            id=str(uuid.uuid4()),
            title=post["title"],
            content=post.get("content", ""),
            author_email=post.get("authorEmail", ""),
        )
        db.add(new_post)
        db.commit()
        return {
            "message": "Post created",
            "data": {"id": new_post.id, "title": new_post.title},
        }
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing field: {e}")
    finally:
        db.close()
