interface MongoDbAtlasProvider {
  /**
   * #### Your MongoDB Atlas public API key.
   *
   * ---
   *
   * Create API keys in the MongoDB Atlas console under Organization Settings > API Keys.
   */
  publicKey?: string;
  /**
   * #### Your MongoDB Atlas private API key. Store as `$Secret()` for security.
   *
   * ---
   *
   * Create API keys in the MongoDB Atlas console under Organization Settings > API Keys.
   */
  privateKey?: string;
  /**
   * #### Your MongoDB Atlas Organization ID.
   *
   * ---
   *
   * Found in the MongoDB Atlas console under Organization Settings.
   */
  organizationId?: string;
  /**
   * #### Network connectivity settings for all MongoDB Atlas clusters in this stack.
   *
   * ---
   *
   * Stacktape auto-creates a MongoDB Atlas Project for your clusters. These accessibility settings
   * apply at the project level — all clusters in the stack share the same network config.
   */
  accessibility?: MongoDbAtlasAccessibility;
}

interface MongoDbAtlasApiCredentials {
  /**
   * #### Your MongoDB Atlas public API key.
   */
  publicKey: string;
  /**
   * #### Your MongoDB Atlas private API key.
   */
  privateKey: string;
}

interface UpstashProvider {
  /**
   * #### Email address of your Upstash account.
   */
  accountEmail: string;
  /**
   * #### API key for your Upstash account. Store as `$Secret()` for security.
   *
   * ---
   *
   * Create an API key in the Upstash console under Account > API Keys.
   */
  apiKey: string;
}
