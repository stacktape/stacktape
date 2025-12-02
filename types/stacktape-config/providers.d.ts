interface MongoDbAtlasProvider {
  /**
   * #### Your MongoDB Atlas public API key.
   *
   * ---
   *
   * You can get API keys for your organization by following the [guide in the docs](https://docs.stacktape.com/user-guides/mongo-db-atlas-credentials/).
   */
  publicKey?: string;
  /**
   * #### Your MongoDB Atlas private API key.
   *
   * ---
   *
   * You can get API keys for your organization by following the [guide in the docs](https://docs.stacktape.com/user-guides/mongo-db-atlas-credentials/).
   *
   * For security reasons, you should store your credentials as secrets. For more details, see the [secrets guide](https://docs.stacktape.com/resources/secrets/).
   */
  privateKey?: string;
  /**
   * #### Your MongoDB Atlas Organization ID.
   *
   * ---
   *
   * You can get the organization ID for your organization by following the [guide in the docs](https://docs.stacktape.com/user-guides/mongo-db-atlas-credentials/).
   */
  organizationId?: string;
  /**
   * #### Configures the connectivity settings of the MongoDB Atlas project.
   *
   * ---
   *
   * If your stack contains a MongoDB Atlas cluster, Stacktape will automatically create a MongoDB Atlas Project for it.
   * All MongoDB Atlas clusters in your stack will be deployed within this project.
   *
   * Network connectivity to clusters is configured at the project level, so the accessibility settings defined here will apply to all MongoDB Atlas clusters in your stack.
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
   * #### The email address associated with your Upstash account.
   *
   * ---
   *
   * All database operations (create, update, delete) will be performed on behalf of this account.
   */
  accountEmail: string;
  /**
   * #### The API key associated with your Upstash account or team.
   *
   * ---
   *
   * You can create an API key in the [Upstash console](https://console.upstash.com/account/api).
   */
  apiKey: string;
}
