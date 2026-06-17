import httpx
from typing import Any, Dict, List, Optional
from app.core.config import get_settings
from app.services.mask_compositor import _load_component_mask, _decode_base64_image, mask_to_base64_png


class OpenRouterClient:
    def __init__(self):
        self.settings = get_settings()

    async def enhance_renovation(
        self,
        composited_image_base64: str,
        original_image_base64: str,
        components: List[Dict[str, Any]],
        materials: Dict[str, Dict[str, Any]],
        component_ids: List[str],
    ) -> str:
        """Optionally refine the mask-composited preview with an image model."""
        if not self.settings.OPENROUTER_API_KEY:
            return composited_image_base64

        prompt_parts = [
            "This is an architectural exterior renovation preview.",
            "Enhance the image to look photorealistic while preserving the exact same geometry, perspective, and layout.",
            "Only refine the material finishes — do not move windows, doors, or structural elements.",
            "Changes applied:",
        ]

        for comp_id in component_ids:
            mat = materials.get(comp_id)
            comp = next((c for c in components if c["id"] == comp_id), None)
            if not mat or not comp:
                continue
            prompt_parts.append(
                f"- {comp.get('label', comp_id)}: {mat.get('material_name', 'material')} "
                f"in color {mat.get('color_hex', '')} ({mat.get('finish', '')} finish)"
            )

        prompt = " ".join(prompt_parts)

        img_data = (
            composited_image_base64
            if composited_image_base64.startswith("data:")
            else f"data:image/jpeg;base64,{composited_image_base64}"
        )

        headers = {
            "Authorization": f"Bearer {self.settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "House Renovation App",
        }

        payload = {
            "model": self.settings.OPENROUTER_MODEL,
            "modalities": ["image", "text"],
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": img_data}},
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                self.settings.OPENROUTER_BASE_URL, json=payload, headers=headers
            )
            response.raise_for_status()
            data = response.json()

        return self._extract_image(data, fallback=composited_image_base64)

    async def generate_renovation(
        self,
        original_image_base64: str,
        mask_base64: str,
        material_prompt: str,
        component_type: str,
        component_label: str = "component",
    ) -> str:
        if original_image_base64.startswith("data:"):
            img_data = original_image_base64
        else:
            img_data = f"data:image/jpeg;base64,{original_image_base64}"

        prompt = self._build_inpainting_prompt(
            material_prompt, component_label, bool(mask_base64)
        )

        content: List[Dict[str, Any]] = [
            {"type": "image_url", "image_url": {"url": img_data}},
        ]

        if mask_base64:
            mask_url = (
                mask_base64
                if mask_base64.startswith("data:")
                else f"data:image/png;base64,{mask_base64}"
            )
            content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": mask_url},
                }
            )

        content.append({"type": "text", "text": prompt})

        headers = {
            "Authorization": f"Bearer {self.settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "House Renovation App",
        }

        payload = {
            "model": self.settings.OPENROUTER_MODEL,
            "modalities": ["image", "text"],
            "messages": [{"role": "user", "content": content}],
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                self.settings.OPENROUTER_BASE_URL, json=payload, headers=headers
            )
            response.raise_for_status()
            data = response.json()

        return self._extract_image(data)

    def build_combined_mask(
        self,
        original_image_base64: str,
        components: List[Dict[str, Any]],
        component_ids: List[str],
    ) -> Optional[str]:
        base = _decode_base64_image(original_image_base64)
        width, height = base.size

        from PIL import Image

        combined = Image.new("L", (width, height), 0)
        for comp_id in component_ids:
            comp = next((c for c in components if c["id"] == comp_id), None)
            if not comp:
                continue
            mask = _load_component_mask(
                width,
                height,
                comp.get("mask_base64"),
                comp.get("bbox", [0, 0, width, height]),
                comp.get("polygon"),
            )
            combined = Image.frombytes("L", combined.size, combined.tobytes())
            combined_pixels = combined.load()
            mask_pixels = mask.load()
            for y in range(height):
                for x in range(width):
                    if mask_pixels[x, y] > 128:
                        combined_pixels[x, y] = 255

        if not any(px > 128 for px in combined.getdata()):
            return None
        return mask_to_base64_png(combined)

    def _extract_image(self, data: dict, fallback: Optional[str] = None) -> str:
        message = data["choices"][0]["message"]

        images = message.get("images") or []
        for part in images:
            if isinstance(part, dict) and part.get("type") == "image_url":
                img_url = part.get("image_url", {}).get("url", "")
                if img_url.startswith("data:"):
                    return img_url
                if img_url:
                    return img_url

        content = message.get("content")
        if isinstance(content, list):
            for part in content:
                if part.get("type") == "image_url":
                    img_url = part["image_url"]["url"]
                    if img_url.startswith("data:"):
                        return img_url
                    return img_url

        if isinstance(content, str) and content:
            return content

        if fallback:
            return fallback
        raise ValueError("OpenRouter response did not include a generated image")

    def _build_inpainting_prompt(
        self,
        material_prompt: str,
        component_label: str,
        has_mask: bool,
    ) -> str:
        mask_instruction = (
            "The second image is a binary mask indicating the general area to modify "
            "(white pixels). The mask may not be perfectly precise — apply changes only "
            "within the masked region and do not alter anything outside it."
            if has_mask
            else f"Modify ONLY the {component_label} region, nothing else."
        )

        return (
            f"Apply {material_prompt} to the {component_label} only. "
            f"{mask_instruction} "
            "Photorealistic architectural renovation, preserve the original structure and geometry."
        )


openrouter_client = OpenRouterClient()
