import socket
import time
import asyncio
import redis
import httpx
import schedule
from datetime import datetime

from app.config import settings
from app.services.metrics import CHECKS_TOTAL, CHECKS_FAILED, SERVICES_UP


def get_redis():
    return redis.from_url(settings.redis_url, decode_responses=True)


def check_tcp_port(host: str, port: int, timeout: float = 3.0) -> dict:
    start = time.time()
    try:
        sock = socket.create_connection((host, port), timeout)
        sock.close()
        latency = round((time.time() - start) * 1000, 1)
        return {"status": "up", "latency_ms": latency}
    except (socket.timeout, ConnectionRefusedError, OSError) as e:
        return {"status": "down", "error": str(e)}


def check_http_endpoint(url: str, timeout: float = 5.0) -> dict:
    start = time.time()
    try:
        with httpx.Client(verify=False, timeout=timeout) as client:
            resp = client.get(url)
            latency = round((time.time() - start) * 1000, 1)
            return {
                "status": "up" if resp.status_code < 500 else "degraded",
                "status_code": resp.status_code,
                "latency_ms": latency,
            }
    except (httpx.RequestError, httpx.HTTPStatusError) as e:
        return {"status": "down", "error": str(e)}


def run_all_checks() -> list[dict]:
    results = []
    up_count = 0

    for service_spec in settings.internal_services.split(","):
        service_spec = service_spec.strip()
        if not service_spec:
            continue

        if ":" in service_spec:
            host, port_str = service_spec.rsplit(":", 1)
            port = int(port_str)
            result = check_tcp_port(host, port)
        else:
            result = {"status": "unknown", "error": "invalid service spec"}

        result["service"] = service_spec
        result["checked_at"] = datetime.utcnow().isoformat()
        CHECKS_TOTAL.inc()

        if result["status"] == "up":
            up_count += 1
        else:
            CHECKS_FAILED.inc()

        results.append(result)

    SERVICES_UP.set(up_count)

    r = get_redis()
    try:
        r.lpush("check_history", str(results))
        r.ltrim("check_history", 0, 999)
    except redis.ConnectionError:
        pass

    return results


def get_check_history(limit: int = 50) -> list:
    r = get_redis()
    try:
        raw = r.lrange("check_history", 0, limit - 1)
        import ast
        return [ast.literal_eval(item) for item in raw]
    except redis.ConnectionError:
        return []


async def start_background_checker():
    while True:
        try:
            run_all_checks()
        except Exception as e:
            print(f"[checker] error: {e}")
        await asyncio.sleep(settings.check_interval)
