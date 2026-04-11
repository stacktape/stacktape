package main

import (
	"fmt"
	"net/http"
	"os"
)

func handler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/error" {
		panic("Go container panic with stack trace")
	}
	fmt.Fprintf(w, "OK")
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	http.HandleFunc("/", handler)
	fmt.Printf("Go container started on port %s\n", port)
	http.ListenAndServe(":"+port, nil)
}
