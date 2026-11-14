FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_APP=app.py

WORKDIR /app

COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt

COPY . .

EXPOSE 5000

# En desarrollo se monta .:/app y --debug recarga en caliente.
CMD ["flask", "run", "--host", "0.0.0.0", "--port", "5000", "--debug"]
