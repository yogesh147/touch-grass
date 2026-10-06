from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from models import QuestRequest
from planner import generate_quest


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"


app = FastAPI(
    title="Touch Grass API",
    description="AI-powered outdoor micro-adventure planner.",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Serve frontend assets.
app.mount(
    "/static",
    StaticFiles(directory=str(FRONTEND_DIR)),
    name="static",
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "touch-grass",
    }


@app.get("/api/status")
async def status():
    return {
        "service": "touch-grass",
        "gemma_configured": bool(
            __import__("os").getenv("GEMMA_URL")
        ),
    }


@app.post("/api/quest")
async def create_quest(request: QuestRequest):

    try:
        quest = await generate_quest(request)

        return {
            "success": True,
            "source": "gemma",
            "quest": quest,
        }

    except Exception as exc:

        # Don't expose internal stack traces.
        raise HTTPException(
            status_code=503,
            detail="Gemma quest generation is currently unavailable.",
        ) from exc


@app.get("/sw.js")
async def service_worker():
    return FileResponse(
        FRONTEND_DIR / "sw.js",
        media_type="application/javascript",
        )


@app.get("/manifest.json")
async def manifest():
    return FileResponse(
        FRONTEND_DIR / "manifest.json",
        media_type="application/manifest+json",
        )


@app.get("/")
async def index():
    return FileResponse(
        FRONTEND_DIR / "index.html",
        )
