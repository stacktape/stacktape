export type LogicalId = string & { readonly logicalId: unique symbol };
export type PhysicalName = string & { readonly physicalName: unique symbol };

export interface NamingStrategy {
  logicalId(parts: readonly string[]): LogicalId;
  physicalName(parts: readonly string[]): PhysicalName;
}
