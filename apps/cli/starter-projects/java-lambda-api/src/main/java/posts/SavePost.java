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
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.util.Map;
import java.util.HashMap;
import java.util.UUID;

public class SavePost implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent>{
  private AmazonDynamoDB amazonDynamoDB;


  @Override
  public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent event, Context context)
  {
    //prepare response
    APIGatewayProxyResponseEvent response = new APIGatewayProxyResponseEvent();
    response.setIsBase64Encoded(false);
    Map<String, String> headers = new HashMap<String, String>();
    headers.put("Content-Type", "application/json");
    response.setHeaders(headers);

    try {
      //initialize dynamoDB client
      this.amazonDynamoDB = AmazonDynamoDBClientBuilder.standard().build();

      Gson gson = new GsonBuilder().create();

      //example logs
      LambdaLogger logger = context.getLogger();
      logger.log("\nKENVIRONMENT VARIABLES: " + gson.toJson(System.getenv()));
      logger.log("\nCONTEXT: " + context.toString());
      logger.log("\nEVENT: " + gson.toJson(event));
      logger.log("\nEVENT TYPE: " + event.getClass());
      //parse body
      logger.log("\nBODY" + event.getBody());

      JsonObject body = JsonParser.parseString(event.getBody()).getAsJsonObject();
      logger.log("\nBODY2: " + new AttributeValue(body.get("title").getAsString()));

      //prepare document to put in dynamoDB
      Map<String, AttributeValue> item = new HashMap<>();
      item.put("id", new AttributeValue(UUID.randomUUID().toString()));
      item.put("title", new AttributeValue(body.get("title").getAsString()));
      item.put("content", new AttributeValue(body.get("content").getAsString()));
      item.put("authorEmail", new AttributeValue(body.get("authorEmail").getAsString()));

      amazonDynamoDB.putItem(System.getenv("STP_MAIN_DYNAMO_DB_TABLE_NAME"), item);

      response.setStatusCode(200);
      response.setBody("Post saved");
      return response;
    } catch (Exception e) {
      response.setStatusCode(500);
      response.setBody(e.toString());
      return response;
    }
  }
}
