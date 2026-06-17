from fastapi import APIRouter, HTTPException
from app.schemas.session import VisualizeRequest, VisualizeResponse
from app.services.session_store import session_store
from app.services.component_geometry import normalize_components_coordinates
from app.services.mask_compositor import composite_all_materials
from app.services.openrouter_client import openrouter_client

router = APIRouter()


@router.post("/session/{session_id}/visualize", response_model=VisualizeResponse)
async def generate_visualization(session_id: str, request: VisualizeRequest):
    session_data = session_store.get(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    image_base64 = session_data.get("original_image_base64")
    if not image_base64:
        raise HTTPException(status_code=400, detail="No image uploaded")

    materials = session_data.get("materials", {})
    if not materials:
        raise HTTPException(status_code=400, detail="No materials selected")

    components = session_data.get("components", [])
    image_width = session_data.get("image_width", 0)
    image_height = session_data.get("image_height", 0)
    components = normalize_components_coordinates(components, image_width, image_height)
    component_ids = request.component_ids or list(materials.keys())

    try:
        composited_b64 = composite_all_materials(
            original_image_base64=image_base64,
            components=components,
            materials=materials,
            component_ids=component_ids,
        )

        enhanced_b64 = composited_b64
        try:
            enhanced_b64 = await openrouter_client.enhance_renovation(
                composited_image_base64=composited_b64,
                original_image_base64=image_base64,
                components=components,
                materials=materials,
                component_ids=component_ids,
            )
        except Exception as ai_error:
            print(f"AI enhancement skipped: {ai_error}")

        session_store.update(
            session_id,
            {
                "visualization_base64": enhanced_b64,
                "step": "estimate",
            },
        )

        return VisualizeResponse(
            session_id=session_id,
            visualization_base64=enhanced_b64,
            message="Visualization generated successfully",
        )
    except Exception as e:
        print(f"Visualization error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate visualization")
