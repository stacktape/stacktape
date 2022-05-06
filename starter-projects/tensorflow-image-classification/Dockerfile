FROM tensorflow/tensorflow:2.8.0

COPY requirements.txt requirements.txt

RUN pip install

WORKDIR /app/

ADD src/classify-images.py src/classify-images.py
ADD src/labels.txt src/labels.txt

CMD python src/classify-images.py
