export default async (event, context) => {
  console.info(event, context);

  return { message: 'Hello!' };
};
