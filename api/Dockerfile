FROM python:3.12-slim

WORKDIR /app

# The pinned Ultralytics stack uses the regular OpenCV wheel.
RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Container deployments get the full CV stack (opencv, ultralytics) so the
# ball-tracking endpoint works. Set ENABLE_BALL_TRACKING=true at runtime to expose it.
COPY requirements.txt requirements-full.txt ./
RUN pip install --no-cache-dir --require-hashes --no-deps -r requirements-full.txt && pip check

COPY . .

ENV ENABLE_BALL_TRACKING=true

EXPOSE 8080

CMD ["uvicorn", "index:app", "--host", "0.0.0.0", "--port", "8080"]
