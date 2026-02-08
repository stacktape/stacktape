FROM nvidia/cuda:12.4.0-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*
RUN pip3 install torch --index-url https://download.pytorch.org/whl/cu124

COPY inference.py /app/inference.py
WORKDIR /app

CMD ["python3", "inference.py"]
