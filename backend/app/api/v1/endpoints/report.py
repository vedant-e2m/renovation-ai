from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.services.session_store import session_store
from app.services.report import generate_pdf_report

router = APIRouter()

@router.post("/session/{session_id}/report")
async def download_report(session_id: str):
    session_data = session_store.get(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    estimate = session_data.get("estimate")
    if not estimate:
        raise HTTPException(status_code=400, detail="No estimate available to generate report")

    try:
        pdf_bytes = generate_pdf_report(session_data)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=renovation_report_{session_id}.pdf"
            }
        )
    except Exception as e:
        print(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")
