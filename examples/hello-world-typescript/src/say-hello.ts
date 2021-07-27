export default async (event, context) => {
  // @note you can see this log in AWS CloudWatch console, or using stacktape logs command
  console.info(event, context);

  return { message: 'Hello!' };
};
