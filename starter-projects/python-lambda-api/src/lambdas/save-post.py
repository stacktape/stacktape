from pymongo import MongoClient
import os, json


client = MongoClient(os.environ['MONGODB_CONNECTION_STRING'])

def handler(event, context):

    try:
        db = client[os.environ['DATABASE_NAME']]
        posts = db.posts
        foundPost = posts.find_one({'_id': json.loads(event['body'])['id']})
        return {
            'statusCode': 200,
            'body': json.dumps(foundPost)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(str(e))
        }

if __name__ == "__main__":
    print(handler(None, None))
