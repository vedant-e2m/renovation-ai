from fastapi import APIRouter, HTTPException
from app.schemas.session import DetectRequest, DetectResponse, ComponentUpdate
from app.services.gemini_detection_client import (
    GeminiDetectionError,
    gemini_detection_client,
)
from app.services.session_store import session_store

router = APIRouter()

@router.post("/session/{session_id}/detect", response_model=DetectResponse)
async def detect_components(session_id: str, request: DetectRequest):
    session_data = session_store.get(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    image_base64 = session_data.get("original_image_base64")
    if not image_base64:
        raise HTTPException(status_code=400, detail="No image uploaded for this session")

    try:
        components = await gemini_detection_client.detect_components(
            image_base64,
            prompt=request.prompt,
            image_width=session_data.get("image_width"),
            image_height=session_data.get("image_height"),
        )
    except GeminiDetectionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    
    # Store components in session
    components_data = [comp.model_dump() for comp in components]
    session_store.update(session_id, {
        "components": components_data,
        "step": "design"
    })

    return DetectResponse(
        session_id=session_id,
        components=components,
        message=f"Detected {len(components)} components successfully"
    )

@router.patch("/session/{session_id}/components", response_model=DetectResponse)
async def update_components(session_id: str, update: ComponentUpdate):
    session_data = session_store.get(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        components_data = [comp.model_dump() for comp in update.components]
        updated = session_store.update(session_id, {"components": components_data})
        if not updated:
            raise HTTPException(status_code=404, detail="Session not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save components: {e}")

    return DetectResponse(
        session_id=session_id,
        components=update.components,
        message="Components updated successfully",
    )
