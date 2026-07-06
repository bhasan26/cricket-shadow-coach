FROM python:3.12-slim

WORKDIR /app

# Container deployments get the full CV stack (opencv, ultralytics) so the
# ball-tracking endpoint works. Set ENABLE_BALL_TRACKING=true at runtime to expose it.
COPY requirements.txt requirements-full.txt ./
RUN pip install --no-cache-dir -r requirements-full.txt

COPY . .

ENV ENABLE_BALL_TRACKING=true

EXPOSE 8080

CMD ["uvicorn", "index:app", "--host", "0.0.0.0", "--port", "8080"]
