// This file is auto-generated. Do not edit manually.
// Source: aws-opensearchserverless-index.json

/** An OpenSearch Serverless index resource */
export type AwsOpensearchserverlessIndex = {
  /** The endpoint for the collection. */
  CollectionEndpoint: string;
  /**
   * The name of the OpenSearch Serverless index.
   * @pattern ^(?![_-])[a-z][a-z0-9_-]*$
   */
  IndexName: string;
  /** Index settings */
  Settings?: {
    Index?: {
      /** How often to perform refresh operation (e.g. '1s', '5s') */
      RefreshInterval?: string;
      /** Enable/disable k-nearest neighbor search capability */
      Knn?: boolean;
      /** Size of the dynamic list for the nearest neighbors */
      KnnAlgoParamEfSearch?: number;
    };
  };
  /** Index Mappings */
  Mappings?: {
    /** Defines the fields within the mapping, including their types and configurations */
    Properties?: Record<string, {
      /** Dimension size for vector fields, defines the number of dimensions in the vector */
      Dimension?: number;
      /** Whether a field should be indexed */
      Index?: boolean;
      /** Configuration for k-NN search method */
      Method?: {
        /**
         * The k-NN search engine to use
         * @enum ["nmslib","faiss","lucene"]
         */
        Engine?: "nmslib" | "faiss" | "lucene";
        /**
         * The algorithm name for k-NN search
         * @enum ["hnsw","ivf"]
         */
        Name: "hnsw" | "ivf";
        /**
         * The distance function used for k-NN search
         * @enum ["l2","l1","linf","cosinesimil","innerproduct","hamming"]
         */
        SpaceType?: "l2" | "l1" | "linf" | "cosinesimil" | "innerproduct" | "hamming";
        /** Additional parameters for the k-NN algorithm */
        Parameters?: {
          /**
           * The size of the dynamic list used during k-NN graph creation
           * @minimum 1
           */
          EfConstruction?: number;
          /**
           * Number of neighbors to consider during k-NN search
           * @minimum 2
           * @maximum 100
           */
          M?: number;
        };
      };
      /** Nested fields within an object or nested field type */
      Properties?: Record<string, unknown>;
      /**
       * The field data type. Must be a valid OpenSearch field type.
       * @enum ["text","knn_vector"]
       */
      Type: "text" | "knn_vector";
      /** Default value for the field when not specified in a document */
      Value?: string;
    }>;
  };
  /** The unique identifier for the index. */
  Uuid?: string;
};
