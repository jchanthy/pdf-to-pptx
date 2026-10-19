# Multi-stage Dockerfile for Khmer DocFixer FastAPI Backend
# Includes Debian base with fonts-khmeros and LibreOffice for 100% accurate OpenType Khmer font rendering
FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    TEMP_DIR=/tmp/khmer_docfixer_sessions

# Install system dependencies, Khmer Unicode fonts, and LibreOffice for OpenType PDF conversion
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-khmeros \
    fonts-khmeros-core \
    libreoffice-impress \
    libreoffice-writer \
    curl \
    ca-certificates \
    && fc-cache -fv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy source code and dictionary files
COPY . .

# Set PYTHONPATH so 'backend' package and modules resolve cleanly
ENV PYTHONPATH="/app/src:/app:${PYTHONPATH}"

EXPOSE 8000

# Run uvicorn on dynamic port provided by Render ($PORT) or default 8000
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
