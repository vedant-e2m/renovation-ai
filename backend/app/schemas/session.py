from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ComponentType(str, Enum):
    WALL = "wall"
    WINDOW = "window"
    DOOR = "door"
    BALCONY = "balcony"
    PILLAR = "pillar"
    ROOF = "roof"
    GATE = "gate"
    PARAPET = "parapet"
    RAILING = "railing"


class Component(BaseModel):
    id: str
    type: ComponentType
    label: str
    bbox: List[float] = Field(description="[x, y, width, height] in pixels")
    polygon: List[List[float]] = Field(description="[[x1,y1], [x2,y2], ...] in pixels")
    area_pixels: float
    confidence: float
    mask_base64: Optional[str] = None


class SessionCreate(BaseModel):
    pass


class SessionResponse(BaseModel):
    session_id: str
    created_at: datetime
    step: str
    original_image_base64: Optional[str] = None
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    components: List[Component] = []
    materials: Dict[str, Dict[str, Any]] = {}
    visualization_base64: Optional[str] = None
    estimate: Optional[Dict[str, Any]] = None


class ImageUploadResponse(BaseModel):
    session_id: str
    image_width: int
    image_height: int
    message: str


class DetectRequest(BaseModel):
    prompt: Optional[str] = "wall, window, door, balcony, pillar, roof, gate, parapet, railing"


class DetectResponse(BaseModel):
    session_id: str
    components: List[Component]
    message: str


class ComponentUpdate(BaseModel):
    components: List[Component]


class MaterialSpec(BaseModel):
    material_id: str
    material_name: str
    category: str
    color_hex: str
    finish: str
    cost_per_unit: float
    unit: str
    coverage_per_unit: float
    wastage_pct: float


class MaterialsRequest(BaseModel):
    materials: Dict[str, MaterialSpec]


class MaterialsResponse(BaseModel):
    session_id: str
    materials: Dict[str, MaterialSpec]
    message: str


class VisualizeRequest(BaseModel):
    component_ids: Optional[List[str]] = None


class VisualizeResponse(BaseModel):
    session_id: str
    visualization_base64: str
    message: str


class EstimateResponse(BaseModel):
    session_id: str
    estimate: Dict[str, Any]
    message: str