from fastapi import APIRouter
from app.services.checker import get_check_history, run_all_checks
from app.services.metrics import SERVICES_UP

router = APIRouter()


@router.get("/status")
async def status():
    checks = run_all_checks()
    up = sum(1 for c in checks if c.get("status") == "up")
    return {
        "total_services": len(checks),
        "services_up": up,
        "services_down": len(checks) - up,
        "checks": checks,
    }


@router.get("/history")
async def history(limit: int = 50):
    return {"history": get_check_history(limit=limit)}


@router.get("/stats")
async def stats():
    checks = run_all_checks()
    latencies = [c.get("latency_ms", 0) for c in checks if c.get("latency_ms")]
    return {
        "total_services": len(checks),
        "avg_latency_ms": sum(latencies) / len(latencies) if latencies else 0,
        "max_latency_ms": max(latencies) if latencies else 0,
        "min_latency_ms": min(latencies) if latencies else 0,
    }
