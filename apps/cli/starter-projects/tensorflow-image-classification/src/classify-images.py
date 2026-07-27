import tensorflow.keras as keras
import tensorflow_hub as hub
import numpy as np
import tensorflow as tf
from os import listdir, environ
from zipfile import ZipFile
import boto3
import json
from urllib import parse

# Stacktape passes the event data as an environment variable
event_data = json.loads(environ['STP_TRIGGER_EVENT_DATA'])['Records'][0]

# download a pre-trained model
model = keras.Sequential([hub.KerasLayer(
    "https://tfhub.dev/google/imagenet/efficientnet_v2_imagenet21k_b0/classification/2")])

model.build([None, 224, 224, 3])

# boto3 is the AWS SDK for python
s3 = boto3.client('s3')

zip_file_path = '/tmp/pictures.zip'
pictures_dir = '/tmp/pictures'

s3.download_file(event_data['s3']['bucket']['name'],
                 event_data['s3']['object']['key'], zip_file_path)

with ZipFile(zip_file_path, 'r') as zip_file:
    zip_file.extractall(pictures_dir)


image_names = listdir(pictures_dir)
image_file_paths = ['{}/{}'.format(pictures_dir, t)
                    for t in image_names]

# transform images into an array accepted by the model
arr = np.array([keras.preprocessing.image.img_to_array(tf.image.convert_image_dtype(
    keras.utils.load_img(image_file_path, target_size=(224, 224)), dtype=tf.float32)) for image_file_path in image_file_paths])

# run predictions
predictions = model.predict(arr)

with open('labels.txt', 'r') as f:
    content = f.read()
    labels = content.splitlines()
    for index, prediction in enumerate(predictions):
        # choose the class with highest prediction probability as the "s3 directory prefix"
        s3_prefix = labels[np.argmax(prediction)].replace(', ', '+')
        s3.upload_file(image_file_paths[index],  environ['STP_OUTPUT_BUCKET_NAME'],
                       '{}/{}'.format(s3_prefix, image_names[index]))
