export type LogicalId = string & { readonly logicalId: unique symbol };
export type PhysicalName = string & { readonly physicalName: unique symbol };

export const logicalId = (value: string): LogicalId => value as LogicalId;
export const physicalName = (value: string): PhysicalName => value as PhysicalName;
