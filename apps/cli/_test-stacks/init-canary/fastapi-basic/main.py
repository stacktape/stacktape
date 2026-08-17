from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root():
    return {"fixture": "fastapi-basic"}


@app.get("/health")
def health():
    return {"ok": True}
