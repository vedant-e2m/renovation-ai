from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api.v1.endpoints import session, detection, materials, visualization, estimation, report

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(session.router, prefix=settings.API_V1_PREFIX, tags=["session"])
app.include_router(detection.router, prefix=settings.API_V1_PREFIX, tags=["detection"])
app.include_router(materials.router, prefix=settings.API_V1_PREFIX, tags=["materials"])
app.include_router(visualization.router, prefix=settings.API_V1_PREFIX, tags=["visualization"])
app.include_router(estimation.router, prefix=settings.API_V1_PREFIX, tags=["estimation"])
app.include_router(report.router, prefix=settings.API_V1_PREFIX, tags=["report"])

@app.get("/health")
def health_check():
    return {"status": "ok"}
