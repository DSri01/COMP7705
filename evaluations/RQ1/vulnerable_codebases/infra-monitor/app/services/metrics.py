import time
from prometheus_client import Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


REQUEST_COUNT = Counter(
    "http_requests_total", "Total HTTP requests", ["method", "endpoint", "status"]
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds", "HTTP request latency", ["method", "endpoint"]
)
SERVICES_UP = Gauge("monitor_services_up", "Number of services currently up")
CHECKS_TOTAL = Counter("monitor_checks_total", "Total health checks performed")
CHECKS_FAILED = Counter("monitor_checks_failed_total", "Total failed health checks")


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration = time.time() - start

        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code,
        ).inc()
        REQUEST_LATENCY.labels(
            method=request.method, endpoint=request.url.path
        ).observe(duration)

        return response


def setup_metrics(app):
    app.add_middleware(MetricsMiddleware)


def generate_metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
