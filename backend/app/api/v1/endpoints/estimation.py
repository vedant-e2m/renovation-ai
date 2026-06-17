from fastapi import APIRouter, HTTPException
from app.schemas.session import EstimateResponse, Component
from app.services.session_store import session_store
from app.services.estimation import calculate_scale_factor, calculate_quantities

router = APIRouter()

@router.get("/session/{session_id}/estimate", response_model=EstimateResponse)
async def get_estimate(session_id: str):
    session_data = session_store.get(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    components_data = session_data.get("components", [])
    materials = session_data.get("materials", {})
    
    if not components_data:
        raise HTTPException(status_code=400, detail="No components detected")

    components = [Component(**comp) for comp in components_data]
    
    # Calculate scale factor
    scale_factor = calculate_scale_factor(
        components=components,
        image_width=session_data.get("image_width", 1000),
        image_height=session_data.get("image_height", 1000)
    )

    # Calculate quantities and costs
    estimate = calculate_quantities(
        components=components,
        materials=materials,
        scale_factor=scale_factor
    )

    session_store.update(session_id, {
        "estimate": estimate,
        "step": "report"
    })

    return EstimateResponse(
        session_id=session_id,
        estimate=estimate,
        message="Estimate generated successfully"
    )
