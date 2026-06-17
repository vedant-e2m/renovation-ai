from typing import List, Dict, Any, Optional
from app.schemas.session import Component, ComponentType
import math


STANDARD_SIZES = {
    ComponentType.DOOR: {"width_m": 0.9, "height_m": 2.1},
    ComponentType.WINDOW: {"width_m": 1.2, "height_m": 1.2},
}

MATERIAL_DEFAULTS = {
    "paint": {"coverage_sqm_per_liter": 10, "wastage_pct": 0.10, "unit": "liter"},
    "stone_cladding": {"coverage_sqm_per_unit": 1.0, "wastage_pct": 0.15, "unit": "sqm"},
    "tiles": {"coverage_sqm_per_unit": 1.0, "wastage_pct": 0.10, "unit": "piece"},
    "texture_finish": {"coverage_sqm_per_kg": 3, "wastage_pct": 0.10, "unit": "kg"},
    "glass_railing": {"coverage_m_per_unit": 1.0, "wastage_pct": 0.05, "unit": "meter"},
    "metal_railing": {"coverage_m_per_unit": 1.0, "wastage_pct": 0.05, "unit": "meter"},
    "panels": {"coverage_sqm_per_unit": 1.0, "wastage_pct": 0.10, "unit": "sqm"},
}


def calculate_scale_factor(
    components: List[Component],
    image_width: int,
    image_height: int,
    user_reference: Optional[Dict[str, float]] = None
) -> float:
    if user_reference and "pixels_per_meter" in user_reference:
        return user_reference["pixels_per_meter"]
    
    for comp in components:
        if comp.type in STANDARD_SIZES:
            std = STANDARD_SIZES[comp.type]
            expected_area_sqm = std["width_m"] * std["height_m"]
            if comp.area_pixels > 0:
                return math.sqrt(comp.area_pixels / expected_area_sqm)
    
    diagonal_pixels = math.sqrt(image_width**2 + image_height**2)
    assumed_building_width_m = 10.0
    return diagonal_pixels / (assumed_building_width_m * math.sqrt(2))


def calculate_quantities(
    components: List[Component],
    materials: Dict[str, Dict[str, Any]],
    scale_factor: float
) -> Dict[str, Any]:
    results = {}
    total_area_sqm = 0.0
    
    for comp in components:
        comp_id = comp.id
        material_spec = materials.get(comp_id)
        if not material_spec:
            continue
        
        area_sqm = comp.area_pixels / (scale_factor ** 2)
        total_area_sqm += area_sqm
        
        category = material_spec.get("category", "paint")
        defaults = MATERIAL_DEFAULTS.get(category, MATERIAL_DEFAULTS["paint"])
        
        coverage = material_spec.get("coverage_per_unit", defaults.get("coverage_sqm_per_liter", 10))
        wastage = material_spec.get("wastage_pct", defaults.get("wastage_pct", 0.10))
        unit = material_spec.get("unit", defaults.get("unit", "liter"))
        
        if category in ["glass_railing", "metal_railing"]:
            perimeter_m = calculate_perimeter(comp.polygon) / scale_factor
            quantity = perimeter_m * (1 + wastage) / coverage
        else:
            quantity = area_sqm * (1 + wastage) / coverage
        
        cost_per_unit = material_spec.get("cost_per_unit", 0)
        material_cost = quantity * cost_per_unit
        labor_cost = quantity * material_spec.get("labor_cost_per_unit", cost_per_unit * 0.5)
        
        results[comp_id] = {
            "component_id": comp_id,
            "component_type": comp.type.value,
            "component_label": comp.label,
            "area_sqm": round(area_sqm, 2),
            "material_name": material_spec.get("material_name", ""),
            "category": category,
            "color": material_spec.get("color_hex", ""),
            "finish": material_spec.get("finish", ""),
            "quantity": round(quantity, 2),
            "unit": unit,
            "wastage_pct": wastage * 100,
            "cost_per_unit": cost_per_unit,
            "material_cost": round(material_cost, 2),
            "labor_cost": round(labor_cost, 2),
            "total_cost": round(material_cost + labor_cost, 2),
        }
    
    summary = calculate_summary(results)
    
    return {
        "scale_factor_pixels_per_meter": round(scale_factor, 2),
        "total_area_sqm": round(total_area_sqm, 2),
        "items": results,
        "summary": summary,
    }


def calculate_perimeter(polygon: List[List[float]]) -> float:
    if len(polygon) < 2:
        return 0.0
    perimeter = 0.0
    n = len(polygon)
    for i in range(n):
        j = (i + 1) % n
        dx = polygon[j][0] - polygon[i][0]
        dy = polygon[j][1] - polygon[i][1]
        perimeter += math.sqrt(dx*dx + dy*dy)
    return perimeter


def calculate_summary(items: Dict[str, Any]) -> Dict[str, Any]:
    total_material = sum(v["material_cost"] for v in items.values())
    total_labor = sum(v["labor_cost"] for v in items.values())
    total = total_material + total_labor
    
    by_category = {}
    for v in items.values():
        cat = v["category"]
        if cat not in by_category:
            by_category[cat] = {"material": 0, "labor": 0, "total": 0, "items": 0}
        by_category[cat]["material"] += v["material_cost"]
        by_category[cat]["labor"] += v["labor_cost"]
        by_category[cat]["total"] += v["total_cost"]
        by_category[cat]["items"] += 1
    
    for cat in by_category:
        by_category[cat]["material"] = round(by_category[cat]["material"], 2)
        by_category[cat]["labor"] = round(by_category[cat]["labor"], 2)
        by_category[cat]["total"] = round(by_category[cat]["total"], 2)
    
    return {
        "total_material_cost": round(total_material, 2),
        "total_labor_cost": round(total_labor, 2),
        "grand_total": round(total, 2),
        "by_category": by_category,
    }