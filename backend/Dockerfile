# Use official lightweight Python image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system build dependencies for PostgreSQL and compile tools
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . .

# Expose dynamic Cloud Run port
EXPOSE 8080

# Start FastAPI app, binding dynamically to the Cloud Run PORT environment variable
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
