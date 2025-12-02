import mongoose from 'mongoose';
import { SUCCESS, FAILED, send } from 'cfn-response-promise';

// {start-highlight}
// incoming event is in following form
// {stop-highlight}
// {
//   "RequestType" : "Create" || "Update" || "Delete",
//   "RequestId" : "9db53695-b0a0-47d6-908a-ea2d8a3ab5d7",
//   "ResponseURL" : "https://...",
//   "ResourceType" : "AWS::Cloudformation::CustomResource",
//   "LogicalResourceId" : "...",
//   "StackId" : "arn:aws:cloudformation:...",
//   "ResourceProperties" : {
//      ... properties of custom-resource-instance
//   }
// }

export default async (event, context) => {
  // custom resource definition code
  let success = true;
  let dataToReturn = {};

  try {
    // we are only seeding database if the operation is Create
    if (event.RequestType === 'Create') {
      // {start-highlight}
      // we are using the "mongoConnectionString" property passed by custom-resource-instance to create connection
      const connection = await mongoose.connect(event.ResourceProperties.mongoConnectionString, {
        // {stop-highlight}
        authMechanism: 'MONGODB-AWS',
        authSource: '$external',
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: 'my-test-database'
      });
      // code with seeding the database ...
      // ...
    }
  } catch (err) {
    success = false;
  }
  await send(event, context, success ? SUCCESS : FAILED, dataToReturn, 'customresourceid');
};

// {start-highlight}
// function must respond to "ResponseURL" with response in following form
// we are using "cfn-response-promise" library which formats response for us
// {stop-highlight}
// {
//   "Status" : "SUCCESS" || "FAILED",
//   "RequestId" : "9db53695-b0a0-47d6-908a-ea2d8a3ab5d7",
//   "LogicalResourceId" : "...",
//   "StackId" : "arn:aws:cloudformation:...",
//   "PhysicalResourceId" : "...",
//   "Data" : {
//     ... attributes which can be queried in template using $Param
//   }
// }
