package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"
)

func handler(ctx context.Context) error {
	panic("Go panic from Lambda handler!")
}

func main() {
	lambda.Start(handler)
}
