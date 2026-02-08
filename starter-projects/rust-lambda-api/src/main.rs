use lambda_http::{run, service_fn, Body, Error, Request, Response};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Serialize, Deserialize)]
struct Post {
    title: String,
    content: Option<String>,
    author_email: Option<String>,
}

async fn handler(event: Request) -> Result<Response<Body>, Error> {
    let path = event.uri().path();
    let method = event.method().as_str();

    match (method, path) {
        ("GET", "/") => {
            let body = json!({ "message": "Rust Lambda API running on AWS" });
            Ok(Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .body(Body::Text(body.to_string()))?)
        }
        ("GET", "/posts") => {
            let body = json!({
                "data": [
                    { "id": "1", "title": "Hello from Rust", "content": "Blazing fast serverless API" }
                ]
            });
            Ok(Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .body(Body::Text(body.to_string()))?)
        }
        ("POST", "/posts") => {
            let body_str = match event.body() {
                Body::Text(s) => s.clone(),
                Body::Binary(b) => String::from_utf8_lossy(b).to_string(),
                _ => String::new(),
            };

            match serde_json::from_str::<Post>(&body_str) {
                Ok(post) => {
                    let response = json!({ "message": "Post created", "data": { "title": post.title } });
                    Ok(Response::builder()
                        .status(201)
                        .header("Content-Type", "application/json")
                        .body(Body::Text(response.to_string()))?)
                }
                Err(e) => {
                    let error = json!({ "error": format!("Invalid request body: {}", e) });
                    Ok(Response::builder()
                        .status(400)
                        .header("Content-Type", "application/json")
                        .body(Body::Text(error.to_string()))?)
                }
            }
        }
        _ => {
            let body = json!({ "error": "Not found" });
            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .body(Body::Text(body.to_string()))?)
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .without_time()
        .init();

    run(service_fn(handler)).await
}
