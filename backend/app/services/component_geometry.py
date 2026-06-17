from typing import Any, Dict, List


def scale_points_to_image_space(
    points: List[List[float]],
    image_width: int,
    image_height: int,
) -> List[List[float]]:
    """Map model output coords (0-1 or 0-1000) into image pixel space."""
    if not points:
        return points

    max_x = max(p[0] for p in points)
    max_y = max(p[1] for p in points)

    if max_x <= 1.0 and max_y <= 1.0 and (image_width > 1 or image_height > 1):
        return [[p[0] * image_width, p[1] * image_height] for p in points]

    if (
        max_x <= 1000
        and max_y <= 1000
        and (image_width > 1000 or image_height > 1000)
        and (max_x < image_width * 0.5 or max_y < image_height * 0.5)
    ):
        return [
            [(p[0] / 1000.0) * image_width, (p[1] / 1000.0) * image_height]
            for p in points
        ]

    if max_x > image_width * 1.05 or max_y > image_height * 1.05:
        if max_x <= 1000 and max_y <= 1000:
            return [
                [(p[0] / 1000.0) * image_width, (p[1] / 1000.0) * image_height]
                for p in points
            ]
        scale_x = image_width / max_x if max_x else 1.0
        scale_y = image_height / max_y if max_y else 1.0
        scale = min(scale_x, scale_y)
        return [[p[0] * scale, p[1] * scale] for p in points]

    return points


def _polygon_area(polygon: List[List[float]]) -> float:
    if len(polygon) < 3:
        return 0.0
    area = 0.0
    n = len(polygon)
    for i in range(n):
        j = (i + 1) % n
        area += polygon[i][0] * polygon[j][1]
        area -= polygon[j][0] * polygon[i][1]
    return abs(area) / 2.0


def _polygon_bbox(polygon: List[List[float]]) -> List[float]:
    xs = [p[0] for p in polygon]
    ys = [p[1] for p in polygon]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    return [min_x, min_y, max_x - min_x, max_y - min_y]


def normalize_components_coordinates(
    components: List[Dict[str, Any]],
    image_width: int,
    image_height: int,
) -> List[Dict[str, Any]]:
    """Normalize all component polygons to image pixel space."""
    if not components or not image_width or not image_height:
        return components

    normalized: List[Dict[str, Any]] = []
    for comp in components:
        polygon = comp.get("polygon") or []
        scaled = scale_points_to_image_space(polygon, image_width, image_height)
        if scaled == polygon:
            normalized.append(comp)
            continue

        updated = dict(comp)
        updated["polygon"] = scaled
        updated["bbox"] = _polygon_bbox(scaled)
        updated["area_pixels"] = _polygon_area(scaled)
        normalized.append(updated)

    return normalized
