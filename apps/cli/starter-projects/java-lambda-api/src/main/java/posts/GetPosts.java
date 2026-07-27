package posts;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.amazonaws.services.dynamodbv2.*;
import com.amazonaws.services.dynamodbv2.model.*;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.util.Map;
import java.util.HashMap;

// Handler value: example.Handler
public class GetPosts implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent>{
  private AmazonDynamoDB amazonDynamoDB;

  @Override
  public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent event, Context context)
  {
    //initialize dynamoDB client
    this.amazonDynamoDB = AmazonDynamoDBClientBuilder.standard().build();

    Gson gson = new GsonBuilder().create();
    //prepare response
    APIGatewayProxyResponseEvent response = new APIGatewayProxyResponseEvent();
    response.setIsBase64Encoded(false);
    Map<String, String> headers = new HashMap<String, String>();
    headers.put("Content-Type", "application/json");
    response.setHeaders(headers);
    try {
      //example logs
      LambdaLogger logger = context.getLogger();
      logger.log("ENVIRONMENT VARIABLES: " + gson.toJson(System.getenv()));
      logger.log("CONTEXT: " + gson.toJson(context));
      logger.log("EVENT: " + gson.toJson(event));
      logger.log("EVENT TYPE: " + event.getClass());

      //scan posts table
      ScanRequest scanRequest = new ScanRequest().withTableName(System.getenv("STP_MAIN_DYNAMO_DB_TABLE_NAME"));
      ScanResult result = this.amazonDynamoDB.scan(scanRequest);
      response.setStatusCode(200);
      response.setBody(gson.toJson(result.getItems()));
      return response;
    } catch (Exception e) {
      response.setStatusCode(500);
      return response;
    }
  }
}
