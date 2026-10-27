/**
 * The DynamoDB item key, read from the requests the code sends. A table created with another key rejects every one of
 * them, so these are the shapes the SDKs and the languages write it in, and the cases that must leave it alone.
 */

import { describe, expect, it } from 'bun:test';
import { agreedItemKey, emptyItemKeyObservations, observeItemKeys } from './dynamodb-keys';

const keyOf = (...files: string[]) => {
  const observations = emptyItemKeyObservations();
  for (const contents of files) observeItemKeys(contents, observations);
  return agreedItemKey(observations);
};

const DOCUMENT_CLIENT = "import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';\n";

describe('the DynamoDB item key', () => {
  it.each([
    [
      'a document-client key',
      `${DOCUMENT_CLIENT}new UpdateCommand({ Key: { id: orderId }, TableName })`,
      { partitionKey: 'id' }
    ],
    ['a shorthand key', `${DOCUMENT_CLIENT}new GetCommand({ TableName, Key: { id } })`, { partitionKey: 'id' }],
    [
      'a low-level key with attribute types',
      "import { DynamoDBClient } from '@aws-sdk/client-dynamodb';\nnew GetItemCommand({ Key: { pk: { S: id }, sk: { S: `order#${n}` } } })",
      { partitionKey: 'pk', sortKey: 'sk' }
    ],
    [
      'a Go key',
      'import "github.com/aws/aws-sdk-go-v2/service/dynamodb"\nKey: map[string]types.AttributeValue{"id": &types.AttributeValueMemberS{Value: id}},',
      { partitionKey: 'id' }
    ],
    [
      'a boto3 key',
      "table = boto3.resource('dynamodb').Table(name)\ntable.get_item(Key={'userId': user_id})",
      { partitionKey: 'userId' }
    ],
    [
      'a query through an attribute name alias',
      `${DOCUMENT_CLIENT}new QueryCommand({ KeyConditionExpression: '#c = :c', ExpressionAttributeNames: { '#c': 'customerId' } })`,
      { partitionKey: 'customerId' }
    ],
    [
      "boto3's condition builder",
      "dynamodb.Table(name).query(KeyConditionExpression=Key('tenant').eq(tenant))",
      { partitionKey: 'tenant' }
    ]
  ])('%s', (_, contents, expected) => {
    expect(keyOf(contents)).toEqual(expected);
  });

  it('takes the partition key from a query when a key object lists two attributes', () => {
    expect(
      keyOf(
        `${DOCUMENT_CLIENT}get({ Key: { createdAt, customerId } })`,
        `${DOCUMENT_CLIENT}query({ KeyConditionExpression: 'customerId = :c' })`
      )
    ).toEqual({ partitionKey: 'customerId', sortKey: 'createdAt' });
  });

  it.each([
    [
      'requests that disagree, as with two tables',
      [`${DOCUMENT_CLIENT}{ Key: { id } }`, `${DOCUMENT_CLIENT}{ Key: { orderId } }`]
    ],
    ['an S3 object key', ["new GetObjectCommand({ Bucket, Key: { name: 'k' } })"]],
    ['a paginated scan', [`${DOCUMENT_CLIENT}scan({ ExclusiveStartKey: { id: last } })`]]
  ])('leaves the default for %s', (_, files) => {
    expect(keyOf(...files)).toBeUndefined();
  });
});
