from fastapi import APIRouter
from pydantic import BaseModel

from app.services.checker import run_all_checks, check_tcp_port, check_http_endpoint

router = APIRouter()


class CheckRequest(BaseModel):
    host: str
    port: int | None = None
    url: str | None = None


@router.get("/")
async def list_checks():
    results = run_all_checks()
    return {"checks": results}


@router.post("/")
async def run_single_check(req: CheckRequest):
    if req.url:
        result = check_http_endpoint(req.url)
    elif req.host and req.port:
        result = check_tcp_port(req.host, req.port)
    else:
        return {"error": "Provide either url or host+port"}
    return result
