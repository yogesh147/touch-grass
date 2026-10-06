# =========================================================
# TOUCH GRASS
# FastAPI + Static Frontend
# =========================================================

FROM python:3.12-slim

# Prevent Python from creating .pyc files
# and make logs appear immediately
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=10000

# App directory
WORKDIR /app

# Install Python dependencies first
# This improves Docker layer caching
COPY backend/requirements.txt ./requirements.txt

RUN pip install \
    --no-cache-dir \
    -r requirements.txt

# Copy backend
COPY backend ./backend

# Copy frontend
COPY frontend ./frontend

# Render provides PORT automatically.
EXPOSE 10000

# Start FastAPI
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}"]
