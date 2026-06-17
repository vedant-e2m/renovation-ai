from fastapi import APIRouter, HTTPException
from app.schemas.session import MaterialsRequest, MaterialsResponse
from app.services.session_store import session_store

router = APIRouter()

@router.post("/session/{session_id}/materials", response_model=MaterialsResponse)
async def apply_materials(session_id: str, request: MaterialsRequest):
    session_data = session_store.get(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    materials_data = {k: v.model_dump() for k, v in request.materials.items()}
    
    session_store.update(session_id, {
        "materials": materials_data,
        "step": "visualize"
    })

    return MaterialsResponse(
        session_id=session_id,
        materials=request.materials,
        message="Materials applied successfully"
    )
