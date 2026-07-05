from fastapi import APIRouter
from pydantic import BaseModel

from app.services.checker import get_redis
from app.services.notifier import send_alert

router = APIRouter()


class AlertRule(BaseModel):
    service: str
    threshold_ms: float | None = None
    webhook_url: str | None = None


@router.get("/")
async def list_alert_rules():
    r = get_redis()
    try:
        import json
        rules = r.lrange("alert_rules", 0, -1)
        return {"rules": [json.loads(rule) for rule in rules]}
    except Exception:
        return {"rules": []}


@router.post("/")
async def create_alert_rule(rule: AlertRule):
    import json

    r = get_redis()
    rule_data = rule.model_dump()
    r.lpush("alert_rules", json.dumps(rule_data))
    return {"status": "created", "rule": rule_data}
