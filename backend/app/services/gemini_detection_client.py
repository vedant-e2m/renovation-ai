import json
import logging
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.core.config import get_settings
from app.schemas.session import Component, ComponentType
from app.services.mask_compositor import mask_to_base64_png

logger = logging.getLogger(__name__)

MIN_COMPONENT_AREA = 500
MIN_BBOX_DIMENSION = 20
MAX_DETECTION_ATTEMPTS = 2

VALID_TYPES = {t.value for t in ComponentType}

DEFAULT_CLASSES = (
    "wall, window, door, balcony, pillar, roof, gate, parapet, railing"
)


class GeminiDetectionError(Exception):
    pass


class GeminiDetectionClient:
    def __init__(self):
        self.settings = get_settings()

    async def detect_components(
        self,
        image_base64: str,
        prompt: Optional[str] = None,
        image_width: Optional[int] = None,
        image_height: Optional[int] = None,
    ) -> List[Component]:
        if not image_width or not image_height:
            raise GeminiDetectionError("Image dimensions are required for detection")

        if not self.settings.OPENROUTER_API_KEY:
            raise GeminiDetectionError("OPENROUTER_API_KEY is not configured")

        img_data = self._prepare_image_data(image_base64)
        classes = prompt or DEFAULT_CLASSES
        last_error = "Detection failed"

        for attempt in range(MAX_DETECTION_ATTEMPTS):
            user_prompt = self._build_prompt(
                classes,
                image_width,
                image_height,
                strict=attempt > 0,
            )
            try:
                raw_text = await self._call_openrouter(img_data, user_prompt)
                parsed = self._parse_json_response(raw_text)
                components = self._build_components(parsed, image_width, image_height)
                filtered = self._filter_components(components)
                if filtered:
                    return filtered

                raw_count = len(parsed.get("components", []))
                last_error = (
                    "No valid architectural components were detected. "
                    "Use a clear exterior photo with visible walls, roof, or windows."
                )
                logger.warning(
                    "Detection attempt %s: Gemini returned %s raw items but none were valid",
                    attempt + 1,
                    raw_count,
                )
            except GeminiDetectionError as exc:
                last_error = str(exc)
                logger.warning("Detection attempt %s failed: %s", attempt + 1, exc)

        raise GeminiDetectionError(last_error)

    async def _call_openrouter(self, img_data: str, user_prompt: str) -> str:
        payload = {
            "model": self.settings.OPENROUTER_DETECTION_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You analyze building exterior photos. "
                        "Respond with JSON only, using the requested schema exactly."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": img_data}},
                        {"type": "text", "text": user_prompt},
                    ],
                },
            ],
            "response_format": {"type": "json_object"},
        }

        headers = {
            "Authorization": f"Bearer {self.settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "House Renovation App",
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    self.settings.OPENROUTER_BASE_URL,
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:500]
            logger.error("OpenRouter detection HTTP error: %s", detail)
            raise GeminiDetectionError(
                f"Detection API returned {exc.response.status_code}. "
                "Try again or switch OPENROUTER_DETECTION_MODEL to google/gemini-3.1-pro-preview."
            ) from exc
        except httpx.HTTPError as exc:
            logger.exception("OpenRouter detection request failed")
            raise GeminiDetectionError(
                "Could not reach OpenRouter. Check your network and OPENROUTER_API_KEY."
            ) from exc

        return self._extract_text_content(data)

    def _build_prompt(self, classes: str, width: int, height: int, strict: bool = False) -> str:
        strict_note = (
            "\nCRITICAL: Return a JSON object with a top-level \"components\" array. "
            "Do not return a bare array. Every item must include type, label, confidence, "
            f"and polygon with pixel coordinates from 0 to {width} (x) and 0 to {height} (y)."
            if strict
            else ""
        )

        return f"""Analyze this building exterior photo ({width}x{height} pixels).

Detect visible components from these types: {classes}

Return ONLY valid JSON with this exact shape:
{{
  "components": [
    {{
      "type": "wall",
      "label": "Front Wall",
      "confidence": 0.92,
      "polygon": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    }}
  ]
}}

Rules:
- Top-level value MUST be an object with key "components"
- Use pixel coordinates where x is 0..{width} and y is 0..{height}
- Each polygon must have at least 4 points in clockwise order
- Draw tight outlines around each component surface, not loose bounding boxes
- type must be one of: {", ".join(sorted(VALID_TYPES))}
- label is a short human-readable name
- confidence is between 0 and 1
- Include only clearly visible components
- Avoid duplicate overlapping regions for the same surface{strict_note}"""

    def _prepare_image_data(self, image_base64: str) -> str:
        if image_base64.startswith("data:"):
            return image_base64
        return f"data:image/jpeg;base64,{image_base64}"

    def _extract_text_content(self, data: dict) -> str:
        message = data["choices"][0]["message"]
        content = message.get("content")

        if isinstance(content, str):
            return content

        if isinstance(content, list):
            text_parts = [
                part.get("text", "")
                for part in content
                if isinstance(part, dict) and part.get("type") == "text"
            ]
            combined = "\n".join(part for part in text_parts if part).strip()
            if combined:
                return combined

        raise GeminiDetectionError("OpenRouter response did not include text content")

    def _parse_json_response(self, raw_text: str) -> dict:
        text = raw_text.strip()
        if not text:
            raise GeminiDetectionError("OpenRouter returned empty detection response")

        candidates = [text]
        fenced = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
        if fenced:
            candidates.insert(0, fenced.group(1).strip())

        for candidate in candidates:
            try:
                parsed = json.loads(candidate)
            except json.JSONDecodeError:
                continue

            normalized = self._normalize_parsed_payload(parsed)
            if normalized is not None:
                return normalized

        raise GeminiDetectionError("Failed to parse detection JSON from model response")

    def _normalize_parsed_payload(self, parsed: Any) -> Optional[dict]:
        if isinstance(parsed, list):
            return {"components": parsed}

        if not isinstance(parsed, dict):
            return None

        if isinstance(parsed.get("components"), list):
            return parsed

        if any(key in parsed for key in ("polygon", "type", "label", "points", "bbox")):
            return {"components": [parsed]}

        for key in ("regions", "items", "detections", "results"):
            value = parsed.get(key)
            if isinstance(value, list):
                return {"components": value}

        return None

    def _build_components(
        self,
        parsed: dict,
        image_width: int,
        image_height: int,
    ) -> List[Component]:
        raw_components = parsed.get("components", [])
        if not isinstance(raw_components, list):
            raise GeminiDetectionError("Detection response missing components array")

        components: List[Component] = []
        for item in raw_components:
            component = self._item_to_component(item, image_width, image_height)
            if component:
                components.append(component)

        return components

    def _item_to_component(
        self,
        item: Any,
        image_width: int,
        image_height: int,
    ) -> Optional[Component]:
        if not isinstance(item, dict):
            return None

        comp_type = self._resolve_component_type(item)
        if not comp_type:
            return None

        polygon = self._extract_polygon(item, image_width, image_height)
        if len(polygon) < 3:
            return None

        bbox = self._polygon_to_bbox(polygon)
        area_pixels = self._calculate_polygon_area(polygon)
        if area_pixels <= 0:
            return None

        label = str(item.get("label") or comp_type.replace("_", " ").title()).strip()
        confidence_raw = item.get("confidence", 0.75)
        try:
            confidence = float(confidence_raw)
        except (TypeError, ValueError):
            confidence = 0.75
        confidence = max(0.0, min(1.0, confidence))

        mask_base64 = self._polygon_to_mask_base64(
            polygon,
            image_width,
            image_height,
        )

        return Component(
            id=str(uuid.uuid4())[:8],
            type=ComponentType(comp_type),
            label=label,
            bbox=bbox,
            polygon=polygon,
            area_pixels=area_pixels,
            confidence=confidence,
            mask_base64=mask_base64,
        )

    def _resolve_component_type(self, item: dict) -> Optional[str]:
        raw_type = str(item.get("type") or item.get("label") or "").lower().strip()
        if raw_type in VALID_TYPES:
            return raw_type

        for valid_type in VALID_TYPES:
            if valid_type in raw_type:
                return valid_type

        return None

    def _extract_polygon(
        self,
        item: dict,
        image_width: int,
        image_height: int,
    ) -> List[List[float]]:
        for key in ("polygon", "points", "vertices", "outline"):
            polygon = self._normalize_polygon(item.get(key), image_width, image_height)
            if len(polygon) >= 3:
                return polygon

        bbox = item.get("bbox")
        if isinstance(bbox, (list, tuple)) and len(bbox) == 4:
            return self._bbox_values_to_polygon(bbox, image_width, image_height)

        point = item.get("point")
        if isinstance(point, (list, tuple)) and len(point) == 4:
            return self._bbox_values_to_polygon(point, image_width, image_height)

        return []

    def _bbox_values_to_polygon(
        self,
        bbox: Any,
        image_width: int,
        image_height: int,
    ) -> List[List[float]]:
        try:
            x1, y1, x2, y2 = [float(v) for v in bbox]
        except (TypeError, ValueError):
            return []

        if x2 > x1 and y2 > y1 and (x2 - x1) < image_width and (y2 - y1) < image_height:
            polygon = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]
        else:
            x, y, w, h = x1, y1, x2, y2
            polygon = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]

        return self._normalize_polygon(polygon, image_width, image_height)

    def _normalize_polygon(
        self,
        polygon: Any,
        image_width: int,
        image_height: int,
    ) -> List[List[float]]:
        if not isinstance(polygon, list):
            return []

        points: List[List[float]] = []
        for point in polygon:
            if isinstance(point, dict):
                x = point.get("x")
                y = point.get("y")
            elif isinstance(point, (list, tuple)) and len(point) >= 2:
                x, y = point[0], point[1]
            else:
                continue

            try:
                px = float(x)
                py = float(y)
            except (TypeError, ValueError):
                continue

            points.append([px, py])

        if len(points) >= 2 and points[0] == points[-1]:
            points = points[:-1]

        if not points:
            return []

        max_x = max(p[0] for p in points)
        max_y = max(p[1] for p in points)

        if max_x > image_width * 1.05 or max_y > image_height * 1.05:
            if max_x <= 1000 and max_y <= 1000:
                points = [
                    [
                        (p[0] / 1000.0) * image_width,
                        (p[1] / 1000.0) * image_height,
                    ]
                    for p in points
                ]
            else:
                scale_x = image_width / max_x if max_x else 1.0
                scale_y = image_height / max_y if max_y else 1.0
                scale = min(scale_x, scale_y)
                points = [[p[0] * scale, p[1] * scale] for p in points]

        clipped: List[List[float]] = []
        for px, py in points:
            clipped.append(
                [
                    max(0.0, min(float(image_width), px)),
                    max(0.0, min(float(image_height), py)),
                ]
            )

        return clipped

    def _polygon_to_bbox(self, polygon: List[List[float]]) -> List[float]:
        xs = [p[0] for p in polygon]
        ys = [p[1] for p in polygon]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        return [min_x, min_y, max_x - min_x, max_y - min_y]

    def _calculate_polygon_area(self, polygon: List[List[float]]) -> float:
        if len(polygon) < 3:
            return 0.0

        area = 0.0
        n = len(polygon)
        for i in range(n):
            j = (i + 1) % n
            area += polygon[i][0] * polygon[j][1]
            area -= polygon[j][0] * polygon[i][1]
        return abs(area) / 2.0

    def _polygon_to_mask_base64(
        self,
        polygon: List[List[float]],
        image_width: int,
        image_height: int,
    ) -> str:
        from PIL import Image, ImageDraw

        mask = Image.new("L", (image_width, image_height), 0)
        draw = ImageDraw.Draw(mask)
        flat: List[Tuple[float, float]] = [(p[0], p[1]) for p in polygon]
        draw.polygon(flat, fill=255)
        return mask_to_base64_png(mask)

    def _filter_components(self, components: List[Component]) -> List[Component]:
        return [
            component
            for component in components
            if component.area_pixels >= MIN_COMPONENT_AREA
            and component.bbox[2] >= MIN_BBOX_DIMENSION
            and component.bbox[3] >= MIN_BBOX_DIMENSION
        ]


gemini_detection_client = GeminiDetectionClient()
