import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { NativeAttributeValue } from "./models";
import { unmarshallOptions } from "./unmarshall";
/**
 * Convert a DynamoDB AttributeValue object to its equivalent JavaScript type.
 *
 * @param {AttributeValue} data - The DynamoDB record to convert to JavaScript type.
 * @param {unmarshallOptions} options - An optional configuration object for `convertToNative`.
 */
export declare const convertToNative: (data: AttributeValue, options?: unmarshallOptions | undefined) => NativeAttributeValue;
