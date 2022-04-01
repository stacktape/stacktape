import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { marshallOptions } from "./marshall";
import { NativeAttributeValue } from "./models";
/**
 * Convert a JavaScript value to its equivalent DynamoDB AttributeValue type
 *
 * @param {NativeAttributeValue} data - The data to convert to a DynamoDB AttributeValue
 * @param {marshallOptions} options - An optional configuration object for `convertToAttr`
 */
export declare const convertToAttr: (data: NativeAttributeValue, options?: marshallOptions | undefined) => AttributeValue;
