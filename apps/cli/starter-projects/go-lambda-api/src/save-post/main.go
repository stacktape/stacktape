package main

import (
	"context"
	"encoding/json"
	"log"
	"os"

	"github.com/aws/aws-lambda-go/events"
	runtime "github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-lambda-go/lambdacontext"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/google/uuid"
)

func callLambda(body string) (string, error) {
	session := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))
	svc := dynamodb.New(session)

	item, err := dynamodbattribute.MarshalMap(body)
	if err != nil {
		return "Failed to marshall request", err
	}

	item["id"] = &dynamodb.AttributeValue{S: aws.String(uuid.NewString())}

	input := &dynamodb.PutItemInput{
		Item:      item,
		TableName: aws.String(os.Getenv("STP_MAIN_DYNAMO_DB_TABLE_NAME")),
	}
	_, err = svc.PutItem(input)
	if err != nil {
		return "Failed to write to db", err
	}
	return "Item saved", err
}

func savePostHandler(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// event
	eventJson, _ := json.MarshalIndent(event, "", "  ")
	log.Printf("EVENT: %s", eventJson)
	// environment variables
	log.Printf("REGION: %s", os.Getenv("AWS_REGION"))
	log.Println("ALL ENV VARS:")
	for _, element := range os.Environ() {
		log.Println(element)
	}
	// request context
	lc, _ := lambdacontext.FromContext(ctx)
	log.Printf("REQUEST ID: %s", lc.AwsRequestID)
	// global variable
	log.Printf("FUNCTION NAME: %s", lambdacontext.FunctionName)
	// context method
	deadline, _ := ctx.Deadline()
	log.Printf("DEADLINE: %s", deadline)
	// AWS SDK call

	response, err := callLambda(event.Body)
	if err != nil {
		return events.APIGatewayProxyResponse{Body: err.Error(), StatusCode: 500}, err
	}
	return events.APIGatewayProxyResponse{Body: response, StatusCode: 200}, nil
}

func main() {
	runtime.Start(savePostHandler)
}
