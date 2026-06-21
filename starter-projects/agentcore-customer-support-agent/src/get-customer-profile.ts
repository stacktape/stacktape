const customers = {
  'cust-1001': {
    customerId: 'cust-1001',
    name: 'Acme Manufacturing',
    plan: 'enterprise',
    supportTier: 'priority',
    status: 'active',
    recentCases: ['Delayed shipment webhook notifications', 'SSO metadata rotation']
  },
  'cust-1002': {
    customerId: 'cust-1002',
    name: 'Northwind Health',
    plan: 'business',
    supportTier: 'standard',
    status: 'active',
    recentCases: ['Billing export format change']
  }
};

export const handler = async (event: any) => {
  const input = event.input || event;
  const customerId = input.customerId || 'cust-1001';
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(customers[customerId as keyof typeof customers] || { customerId, status: 'unknown' })
      }
    ]
  };
};
