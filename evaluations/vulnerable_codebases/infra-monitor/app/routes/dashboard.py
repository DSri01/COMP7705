from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader

from app.services.checker import run_all_checks, get_check_history

router = APIRouter()
jinja_env = Environment(loader=FileSystemLoader("app/templates"))


@router.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    current = run_all_checks()
    history = get_check_history(limit=20)
    up = sum(1 for c in current if c.get("status") == "up")
    total = len(current)

    template = jinja_env.get_template("dashboard.html")
    return template.render(
        current_checks=current,
        history=history,
        up_count=up,
        total_count=total,
    )
