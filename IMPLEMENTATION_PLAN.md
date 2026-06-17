# AI-Based Exterior House Renovation & Cost Estimation System

## Implementation Plan

### System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   React App     │────▶│   FastAPI Backend │────▶│  Roboflow AI       │
│   (Frontend)    │◀────│   (Stateless)     │◀────│  (Detection +      │
└─────────────────┘     └──────────────────┘     │   Segmentation)    │
         │                       │                └────────────────────┘
         ▼                       ▼                         │
   Zustand +                 Redis                         ▼
   React Query               (sessions)          ┌────────────────────┐
         │                                        │  OpenRouter API    │
         ▼                                        │  Nano Banana       │
   LocalStorage                                   │  (Visualization)   │
   (backup/export)                                └────────────────────┘
                                                           │
                                                           ▼
                                                  ┌────────────────────┐
                                                  │  ReportLab         │
                                                  │  (PDF Generation)  │
                                                  └────────────────────┘
```

**AI services use two providers: Roboflow (detection) and OpenRouter (Nano Banana / Gemini image editing). Both use simple API keys — no GCP/Vertex AI credentials needed.**

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + Python 3.11 |
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| Session Store | Redis |
| Detection | Roboflow Inference API (`inference-sdk`) — object detection + segmentation |
| Visualization | OpenRouter API → Nano Banana (`google/gemini-2.5-flash-preview-image`) — conversational image editing |
| PDF Generation | ReportLab |
| Containerization | Docker + Docker Compose |
| HTTP Client | `httpx` (async, for OpenRouter calls) + `inference-sdk` (Roboflow) |

### ML Pipeline

| Step | Provider / Model | Input | Output |
|------|-----------------|-------|--------|
| 1. Detect | Roboflow Inference API (trained model or foundation model) | Image + class labels: `wall, window, door, balcony, pillar, roof, gate, parapet, railing` | Bounding boxes + labels + confidence + optional masks (JSON) |
| 2. Visualize | OpenRouter → Nano Banana (`google/gemini-2.5-flash-preview-image`) | Original image + material/design prompts | Redesigned exterior image |
| 3. Estimate | Python (deterministic) | Bounding box areas + calibration + material catalog | Quantities + cost breakdown |

### API Endpoints (Stateless)

```
POST   /api/v1/session                    # Create session
POST   /api/v1/session/{id}/upload        # Upload image
POST   /api/v1/session/{id}/detect        # Roboflow detection → components[]
PATCH  /api/v1/session/{id}/components    # User corrections
POST   /api/v1/session/{id}/materials     # Apply materials
POST   /api/v1/session/{id}/visualize     # Nano Banana image generation
GET    /api/v1/session/{id}/estimate      # Area/qty/cost
POST   /api/v1/session/{id}/report        # PDF download
```

### Project Structure

```
house-renovation/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   │   ├── session.py
│   │   │   ├── detection.py
│   │   │   ├── materials.py
│   │   │   ├── visualization.py
│   │   │   ├── estimation.py
│   │   │   └── report.py
│   │   ├── core/config.py
│   │   ├── schemas/
│   │   │   └── session.py
│   │   ├── services/
│   │   │   ├── roboflow_client.py        # Roboflow Inference API (detection)
│   │   │   ├── openrouter_client.py      # OpenRouter → Nano Banana (visualization)
│   │   │   ├── session_store.py          # Redis
│   │   │   ├── estimation.py
│   │   │   └── report.py
│   │   ├── main.py
│   │   └── lifespan.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ImageCanvas.tsx           # Fabric.js: bbox overlay, editing
│   │   │   ├── MaterialPicker.tsx
│   │   │   ├── ComparisonSlider.tsx
│   │   │   ├── CostTable.tsx
│   │   │   └── Stepper.tsx
│   │   ├── pages/ (Upload, Detect, Design, Visualize, Estimate, Report)
│   │   ├── hooks/, services/, store/, types/
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
└── README.md
```

### Implementation Phases

#### Phase 1: Foundation (Week 1)
- [x] Docker Compose: Redis + Backend + Frontend
- [x] Backend: FastAPI skeleton, Redis session store, config (API keys for OpenRouter + Roboflow)
- [x] Frontend: Vite+React+TS+Tailwind, API client, session store (Zustand)
- [x] Upload Flow: Image upload → session creation → redirect to detect

#### Phase 2: Detection (Week 2)
- [ ] Roboflow Inference API client integration (`inference-sdk`)
- [ ] Detection endpoint + structured JSON response parsing
- [ ] Frontend: ImageCanvas with bounding box overlay, correction tools

#### Phase 3: Materials & Design (Week 3)
- [ ] Material catalog (in-memory)
- [ ] Material selection UI
- [ ] Design page with live preview

#### Phase 4: Visualization (Week 4)
- [ ] OpenRouter → Nano Banana integration with conversational image editing
- [ ] Visualization endpoint
- [ ] Frontend: Comparison slider (original vs redesigned)

#### Phase 5: Estimation (Week 5)
- [ ] Calibration (door/window reference → pixels/meter)
- [ ] Area calculation from bounding boxes
- [ ] Quantity + cost computation
- [ ] Editable rates table

#### Phase 6: Reports & Polish (Week 6)
- [ ] ReportLab PDF generation
- [ ] Report page with download
- [ ] Export/import JSON
- [ ] Testing, responsive fixes

### Key Implementation Details

#### Roboflow Detection Client (Inference API)
```python
from inference_sdk import InferenceHTTPClient
from pydantic import BaseModel, Field
from typing import List
import uuid

class DetectedComponent(BaseModel):
    label: str
    bbox: List[float]        # [x_min, y_min, width, height] in pixels
    confidence: float
    polygon: List[List[float]] | None = None
    mask_base64: str | None = None

class DetectionResult(BaseModel):
    components: List[DetectedComponent]

# Initialize Roboflow Inference client
client = InferenceHTTPClient(
    api_url="https://detect.roboflow.com",
    api_key="YOUR_ROBOFLOW_API_KEY",
)

# Option A: Use a trained model (upload your own dataset to Roboflow)
result = client.infer(image_path, model_id="building-exterior/1")

# Option B: Use a foundation model (zero-shot detection)
# result = client.infer(image_path, model_id="roboflow-foundation/1")

# Parse Roboflow response → DetectedComponent list
components = []
for pred in result.get("predictions", []):
    x, y, w, h = pred["x"], pred["y"], pred["width"], pred["height"]
    bbox = [x - w/2, y - h/2, w, h]  # Convert center-format to top-left

    points = pred.get("points", [])
    polygon = [[p["x"], p["y"]] for p in points] if points else [
        [bbox[0], bbox[1]],
        [bbox[0] + w, bbox[1]],
        [bbox[0] + w, bbox[1] + h],
        [bbox[0], bbox[1] + h],
    ]

    components.append(DetectedComponent(
        label=pred["class"].capitalize(),
        bbox=bbox,
        confidence=pred.get("confidence", 0.0),
        polygon=polygon,
        mask_base64=pred.get("mask"),
    ))
```

#### OpenRouter → Nano Banana Image Client (Visualization)
```python
import httpx
import base64
import os

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
NANO_BANANA_MODEL = "google/gemini-2.5-flash-preview-image"

async def generate_renovation_image(
    image_base64: str,
    material_prompt: str,
    component_type: str,
) -> str:
    """Send image + prompt to Nano Banana via OpenRouter, return edited image base64."""

    prompt = (
        f"Redesign the exterior: Apply {material_prompt} to the {component_type}. "
        "Photorealistic result, preserve structure and proportions."
    )

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": NANO_BANANA_MODEL,
        "modalities": ["image", "text"],
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}"
                        },
                    },
                    {
                        "type": "text",
                        "text": prompt,
                    },
                ],
            }
        ],
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

    # Extract the generated image from the response
    # Nano Banana returns image data in the message content parts
    content = data["choices"][0]["message"]["content"]
    if isinstance(content, list):
        for part in content:
            if part.get("type") == "image_url":
                img_url = part["image_url"]["url"]
                # If it's a data URI, strip the prefix to get raw base64
                if img_url.startswith("data:"):
                    return img_url.split(",", 1)[1]
                return img_url
    return content  # fallback: text-only response
```

#### Calibration
1. Detect door/window in Roboflow results
2. Assume standard sizes (2.1m × 0.9m door, 1.2m × 1.2m window)
3. Compute pixels/meter from bounding box dimensions
4. Scale all bounding box areas

### Environment Variables (.env)
```bash
# OpenRouter (Nano Banana / Gemini image model)
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=google/gemini-2.5-flash-preview-image

# Roboflow (Detection + Segmentation)
ROBOFLOW_API_KEY=your-roboflow-api-key
ROBOFLOW_MODEL_ID=building-exterior/1
ROBOFLOW_API_URL=https://detect.roboflow.com

# Redis
REDIS_URL=redis://redis:6379/0
SESSION_TTL_HOURS=24

# Backend
BACKEND_CORS_ORIGINS=http://localhost:5173
```

### Authentication

Both providers use simple **API key** authentication — no IAM, no service accounts, no GCP project needed:

| Provider | Auth Method | How |
|----------|------------|-----|
| OpenRouter | API Key | `Authorization: Bearer sk-or-...` header |
| Roboflow | API Key | Passed to `InferenceHTTPClient(api_key=...)` |

- **Local dev**: Set `OPENROUTER_API_KEY` and `ROBOFLOW_API_KEY` in `.env`
- **Docker/Production**: Inject via Docker Compose `environment:` or secrets manager
- **No GCP/Vertex AI dependency**: All Google Cloud packages (`google-genai`, `google-cloud-aiplatform`, `google-auth`) are removed

### Ready to Implement

The plan is complete. All AI services use **OpenRouter** (Nano Banana for image editing) and **Roboflow** (object detection/segmentation). No Vertex AI or Google Cloud dependency.