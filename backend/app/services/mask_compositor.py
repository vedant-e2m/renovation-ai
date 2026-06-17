import base64
import io
import logging
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image, ImageDraw

logger = logging.getLogger(__name__)


def _decode_base64_image(data: str) -> Image.Image:
    if data.startswith("data:"):
        data = data.split(",", 1)[1]
    raw = base64.b64decode(data)
    return Image.open(io.BytesIO(raw)).convert("RGBA")


def _encode_base64_image(image: Image.Image, fmt: str = "JPEG") -> str:
    buffer = io.BytesIO()
    if fmt.upper() == "JPEG":
        image.convert("RGB").save(buffer, format="JPEG", quality=92)
        mime = "image/jpeg"
    else:
        image.save(buffer, format="PNG")
        mime = "image/png"
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:{mime};base64,{encoded}"


def _hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    color = hex_color.lstrip("#")
    if len(color) == 3:
        color = "".join(c * 2 for c in color)
    return tuple(int(color[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def _bbox_to_mask(
    width: int,
    height: int,
    bbox: List[float],
) -> Image.Image:
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    x, y, w, h = bbox
    draw.rectangle([x, y, x + w, y + h], fill=255)
    return mask


def _polygon_to_mask(
    width: int,
    height: int,
    polygon: List[List[float]],
) -> Optional[Image.Image]:
    if not polygon or len(polygon) < 3:
        return None
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    points = [(float(p[0]), float(p[1])) for p in polygon]
    draw.polygon(points, fill=255)
    return mask


def _load_component_mask(
    width: int,
    height: int,
    mask_base64: Optional[str],
    bbox: List[float],
    polygon: Optional[List[List[float]]] = None,
) -> Image.Image:
    # Polygons are the source of truth (users edit them directly), so prefer
    # rasterizing the polygon over any stored mask or the bounding box.
    polygon_mask = _polygon_to_mask(width, height, polygon or [])
    if polygon_mask is not None:
        return polygon_mask

    if mask_base64:
        mask_img = _decode_base64_image(mask_base64).convert("L")
        if mask_img.size == (width, height):
            return mask_img

        full = Image.new("L", (width, height), 0)
        x, y, w, h = bbox
        paste_w = max(1, int(round(w)))
        paste_h = max(1, int(round(h)))
        paste_x = int(round(x))
        paste_y = int(round(y))

        if mask_img.size != (paste_w, paste_h):
            mask_img = mask_img.resize((paste_w, paste_h), Image.Resampling.LANCZOS)
        full.paste(mask_img, (paste_x, paste_y))
        return full

    return _bbox_to_mask(width, height, bbox)


def count_mask_pixels(mask: Image.Image) -> int:
    return sum(1 for px in mask.getdata() if px > 128)


def apply_material_to_image(
    base_image: Image.Image,
    mask: Image.Image,
    color_hex: str,
    opacity: float = 0.72,
) -> Image.Image:
    result = base_image.convert("RGBA")
    width, height = result.size

    if mask.size != (width, height):
        mask = mask.resize((width, height), Image.Resampling.LANCZOS)

    rgb = _hex_to_rgb(color_hex)
    overlay = Image.new("RGBA", (width, height), (*rgb, 0))
    alpha = mask.point(lambda p: int(p * opacity) if p > 128 else 0)
    overlay.putalpha(alpha)

    return Image.alpha_composite(result, overlay)


def composite_all_materials(
    original_image_base64: str,
    components: List[Dict[str, Any]],
    materials: Dict[str, Dict[str, Any]],
    component_ids: Optional[List[str]] = None,
) -> str:
    base = _decode_base64_image(original_image_base64)
    width, height = base.size
    result = base

    targets = component_ids or list(materials.keys())

    for comp_id in targets:
        mat_spec = materials.get(comp_id)
        if not mat_spec:
            continue

        comp = next((c for c in components if c["id"] == comp_id), None)
        if not comp:
            continue

        color_hex = mat_spec.get("color_hex", "#888888")
        mask = _load_component_mask(
            width,
            height,
            comp.get("mask_base64"),
            comp.get("bbox", [0, 0, width, height]),
            comp.get("polygon"),
        )

        pixel_count = count_mask_pixels(mask)
        if pixel_count == 0:
            logger.warning("Empty mask for component %s; skipping", comp_id)
            continue

        result = apply_material_to_image(result, mask, color_hex)

    return _encode_base64_image(result, fmt="JPEG")


def mask_to_base64_png(mask: Image.Image) -> str:
    buffer = io.BytesIO()
    mask.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"
