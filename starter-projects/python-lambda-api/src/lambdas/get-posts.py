from pymongo import MongoClient
import os, json


client = MongoClient(os.environ['MONGODB_CONNECTION_STRING'])

def handler(event, context):

    try:
        db = client[os.environ['DATABASE_NAME']]
        posts = db.posts
        allPosts = posts.all()
        return {
            'statusCode': 200,
            'body': json.dumps(allPosts)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(str(e))
        }

if __name__ == "__main__":
    print(handler(None, None))
