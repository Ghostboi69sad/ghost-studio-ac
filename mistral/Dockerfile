FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /root/.local /root/.local
COPY main.py .
COPY ollama_client.py .

# Create directories with proper permissions
RUN mkdir -p /app/models /app/cache && \
    chmod -R 777 /app/models /app/cache

# Set environment variables
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app
ENV MODEL_CACHE_DIR=/app/cache
ENV MODEL_PATH=/app/models

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
