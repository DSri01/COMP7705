import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.routes import dashboard, checks, api, alerts
from app.services.checker import start_background_checker
from app.services.metrics import setup_metrics


@asynccontextmanager
async def lifespan(app: FastAPI):
    checker_task = asyncio.create_task(start_background_checker())
    yield
    checker_task.cancel()


app = FastAPI(title="Infra Monitor", version="1.2.0", lifespan=lifespan)

setup_metrics(app)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(dashboard.router)
app.include_router(checks.router, prefix="/checks", tags=["checks"])
app.include_router(api.router, prefix="/api", tags=["api"])
app.include_router(alerts.router, prefix="/alerts", tags=["alerts"])


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/metrics")
async def metrics():
    from app.services.metrics import generate_metrics

    return generate_metrics()
