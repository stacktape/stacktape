package main

import (
	"context"
	"errors"

	"github.com/aws/aws-lambda-go/lambda"
)

func handler(ctx context.Context) error {
	return errors.New("Go error from Lambda handler")
}

func main() {
	lambda.Start(handler)
}
