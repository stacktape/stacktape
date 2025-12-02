import { hello } from "@my-organization/utils/src/index";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";

const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  console.log(event, context);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: hello(event?.queryStringParameters?.name),
    }),
  };
};

export default handler;
