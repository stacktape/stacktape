export const handler = async (event: { RequestType: string }) => ({
  PhysicalResourceId: 'webhook',
  Data: { registered: event.RequestType !== 'Delete' }
});
