FROM python:3.8-alpine

RUN apk add --no-cache ffmpeg

RUN pip3 install boto3

WORKDIR /app

COPY video-transform.py .

ENV PYTHONBUFFERED=1

ENTRYPOINT ["python3"]