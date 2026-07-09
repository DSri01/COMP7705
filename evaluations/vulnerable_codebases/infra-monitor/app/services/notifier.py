import httpx
from app.config import settings


def send_alert(service: str, status: str, message: str):
    if not settings.alert_webhook_url:
        return

    try:
        with httpx.Client(verify=False, timeout=5.0) as client:
            client.post(
                settings.alert_webhook_url,
                json={
                    "service": service,
                    "status": status,
                    "message": message,
                    "source": "infra-monitor",
                },
            )
    except (httpx.RequestError, httpx.HTTPStatusError):
        pass
