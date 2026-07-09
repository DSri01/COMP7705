FROM python:3.10-alpine3.19

WORKDIR /app

RUN apk add --no-cache curl libxml2 libpng expat

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8080/health || exit 1

CMD ["python", "app.py"]
