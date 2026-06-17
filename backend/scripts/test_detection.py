#!/usr/bin/env python3
"""Smoke test for session upload + Gemini detection."""

import asyncio
import io
import json
import sys
from pathlib import Path

import httpx
from PIL import Image, ImageDraw

API = "http://127.0.0.1:8000/api/v1"


def make_sample_house_image() -> bytes:
    img = Image.new("RGB", (800, 600), (180, 200, 220))
    draw = ImageDraw.Draw(img)
    draw.polygon([(80, 220), (720, 220), (760, 120), (40, 120)], fill=(120, 60, 40))
    draw.rectangle([100, 220, 700, 520], fill=(210, 200, 185))
    draw.rectangle([180, 300, 300, 420], fill=(120, 180, 220))
    draw.rectangle([500, 300, 620, 420], fill=(120, 180, 220))
    draw.rectangle([340, 360, 460, 520], fill=(90, 55, 35))
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=90)
    return buffer.getvalue()


async def main() -> int:
    image_bytes = make_sample_house_image()

    async with httpx.AsyncClient(timeout=180.0) as client:
        health = await client.get("http://127.0.0.1:8000/health")
        print("health:", health.status_code, health.text)

        session_res = await client.post(f"{API}/session")
        session_res.raise_for_status()
        session_id = session_res.json()["session_id"]
        print("session:", session_id)

        files = {"file": ("house.jpg", image_bytes, "image/jpeg")}
        upload_res = await client.post(f"{API}/session/{session_id}/upload", files=files)
        upload_res.raise_for_status()
        print("upload:", upload_res.json())

        detect_res = await client.post(f"{API}/session/{session_id}/detect", json={})
        print("detect status:", detect_res.status_code)
        try:
            body = detect_res.json()
        except Exception:
            print("detect raw:", detect_res.text[:2000])
            return 1

        if detect_res.status_code != 200:
            print("detect error:", json.dumps(body, indent=2))
            return 1

        components = body.get("components", [])
        print("detect message:", body.get("message"))
        print("components:", len(components))
        for comp in components:
            print(
                f"  - {comp['label']} ({comp['type']}) "
                f"conf={comp['confidence']:.2f} "
                f"area={comp['area_pixels']:.0f} "
                f"poly_pts={len(comp['polygon'])} "
                f"mask={'yes' if comp.get('mask_base64') else 'no'}"
            )

        return 0 if components else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
