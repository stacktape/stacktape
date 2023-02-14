FROM tensorflow/tensorflow:2.8.0

COPY requirements.txt requirements.txt

RUN pip install -r requirements.txt

WORKDIR /app/

ADD src/classify-images.py classify-images.py
ADD src/labels.txt labels.txt

CMD python classify-images.py
