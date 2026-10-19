# Root Dockerfile for Render Web Service (Root directory: .)
FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=8000 \
    TEMP_DIR=/tmp/khmer_docfixer_sessions

# Install system dependencies, Khmer Unicode fonts, and LibreOffice for OpenType PDF conversion
# In Debian Bookworm, package is fonts-khmeros (fonts-khmeros-core is Ubuntu only)
RUN apt-get update && ( \
        apt-get install -y --no-install-recommends \
            fonts-khmeros \
            fontconfig \
            libreoffice-writer-nogui \
            libreoffice-impress-nogui \
            curl \
            ca-certificates \
        || apt-get install -y --no-install-recommends \
            fonts-khmeros \
            fontconfig \
            curl \
            ca-certificates \
    ) \
    && fc-cache -fv \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies from backend/requirements.txt
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend files and custom dictionary
COPY backend/ backend/
COPY custom_dictionary.txt custom_dictionary.txt

ENV PYTHONPATH="/app/backend/src:/app/backend:${PYTHONPATH}"

EXPOSE 8000

CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
