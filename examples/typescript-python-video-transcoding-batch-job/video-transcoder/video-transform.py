from os import environ, listdir
import json
import boto3
import subprocess

print(environ.get('TRIGGER_EVENT'))

event = json.loads(environ.get('TRIGGER_EVENT'))['Records'][0]

# {'s3': {'bucket': {'name': 'video-transformer-test1-video-bucket-db3ba95e'},
#                'object': {'key': 'raw-videos/palms.mp4'}}}

bucket_name = event['s3']['bucket']['name']

object_key = event['s3']['object']['key']

s3_client = boto3.client('s3')

# get object from s3 bucket
name = object_key.split('/')[1]

name_base = name.split('.')[0]

downloaded_filename = '/tmp/{}'.format(name)

s3_client.download_file(
    Bucket=bucket_name, Key=object_key, Filename=downloaded_filename)


# transcoding video
formats = [('720', '/tmp/proccessed-720.mp4'),
           ('480', '/tmp/proccessed-480.mp4'),
           ('360', '/tmp/proccessed-360.mp4')]

for quality, filename in formats:
    print('Transforming video {} to quality {} ...'.format(
        downloaded_filename, quality))
    cmd_result = subprocess.run(
        'ffmpeg -y -i "{}" -vf scale={}:-2,setsar=1:1 -c:v libx264 -c:a copy "{}"'.format(downloaded_filename, quality, filename), shell=True)
    print('Transformation successfull.')

# uploading transcoded versions
for quality, filename in formats:
    print('uploading {} into {}'.format(filename, bucket_name))
    s3_client.upload_file(
        Bucket=bucket_name, Key='transcoded/{}/{}_{}.mp4'.format(name_base, quality, name_base), Filename=filename)
    print('upload success')
