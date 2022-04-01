import { AttributeValue } from "@aws-sdk/client-dynamodb";
/**
 * An optional configuration object for `marshall`
 */
export interface marshallOptions {
    /**
     * Whether to automatically convert empty strings, blobs, and sets to `null`
     */
    convertEmptyValues?: boolean;
    /**
     * Whether to remove undefined values while marshalling.
     */
    removeUndefinedValues?: boolean;
    /**
     * Whether to convert typeof object to map attribute.
     */
    convertClassInstanceToMap?: boolean;
}
/**
 * Convert a JavaScript object into a DynamoDB record.
 *
 * @param {any} data - The data to convert to a DynamoDB record
 * @param {marshallOptions} options - An optional configuration object for `marshall`
 */
export declare const marshall: <T extends { [K in keyof T]: any; }>(data: T, options?: marshallOptions | undefined) => {
    [key: string]: AttributeValue;
};
