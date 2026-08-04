# @stacktape/pricing

This package owns the pricing catalog ingestion and the Stacktape resource cost estimator used by both the public CLI
generator and the private Console applications.

- `catalog` is the public catalog-download contract and flat monthly-price calculation.
- `estimator` maps authored Stacktape resources to pricing products and reads their regional prices from the Console
  DynamoDB table.
- `refresh` is the single high-level operation used by the Console price-loader Lambda. CSV product-name builders,
  static prices, DynamoDB batching, and other ingestion details are package-private.
- Keep the historical product names, CSV filtering rules, static prices, DynamoDB item shape, and 25-item batch size
  stable unless a deliberate data migration is planned.
- The package intentionally standardizes on `@fast-csv/parse` v5, matching the already-deployed Console loader. This
  updates the CLI generator from v4; quoted fields, escaped quotes, blank columns, and multi-name product rows are
  compatibility fixtures and must stay deterministic.
- Unsupported resource types are logged and skipped independently. This intentional fix makes the existing
  per-resource isolation explicit so one newly added resource cannot discard estimates for supported resources.
- Tests must not contact AWS Pricing or DynamoDB.
- Do not turn this package into a general AWS or utility package.
