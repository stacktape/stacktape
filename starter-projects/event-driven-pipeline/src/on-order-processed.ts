const handler = async (event: any) => {
  const order = event.detail;
  console.log(`Order processed notification received:`, JSON.stringify(order));

  // Your notification logic here:
  // - Send confirmation email
  // - Update dashboard
  // - Trigger shipping workflow
  // - Notify external systems

  console.log(`Notification sent for order ${order.orderId}`);
  return { status: 'notified', orderId: order.orderId };
};

export default handler;
