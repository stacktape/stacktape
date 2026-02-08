declare namespace awslambda {
  function streamifyResponse(handler: (event: any, responseStream: any, context: any) => Promise<void>): any;
}
