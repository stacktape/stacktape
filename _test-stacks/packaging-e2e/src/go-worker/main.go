package main

import (
  "log"
  "time"
)

func main() {
  for {
    log.Println("worker ok")
    time.Sleep(30 * time.Second)
  }
}
