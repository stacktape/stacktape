import { Credentials, Provider } from "@aws-sdk/types";
/**
 * Generate key to index the endpoints in the cache
 */
export declare const getCacheKey: (commandName: string, config: {
    credentials: Provider<Credentials>;
}, options: {
    identifiers?: {
        [key: string]: string;
    } | undefined;
}) => Promise<string>;
