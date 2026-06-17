from fastapi import APIRouter, HTTPException, UploadFile, File
from app.schemas.session import SessionCreate, SessionResponse, ImageUploadResponse
from app.services.session_store import session_store
import base64
from PIL import Image
import io

router = APIRouter()

@router.post("/session", response_model=SessionResponse)
def create_session():
    session_id = session_store.create()
    session_data = session_store.get(session_id)
    return session_data

@router.get("/session/{session_id}", response_model=SessionResponse)
def get_session(session_id: str):
    session_data = session_store.get(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    return session_data

@router.post("/session/{session_id}/upload", response_model=ImageUploadResponse)
async def upload_image(session_id: str, file: UploadFile = File(...)):
    session_data = session_store.get(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    contents = await file.read()
    image_base64 = base64.b64encode(contents).decode('utf-8')
    
    # Get image dimensions
    image = Image.open(io.BytesIO(contents))
    width, height = image.size

    session_store.update(session_id, {
        "original_image_base64": f"data:{file.content_type};base64,{image_base64}",
        "image_width": width,
        "image_height": height,
        "step": "detect"
    })

    return ImageUploadResponse(
        session_id=session_id,
        image_width=width,
        image_height=height,
        message="Image uploaded successfully"
    )
