import json
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import redis
from app.core.config import get_settings


class SessionStore:
    def __init__(self):
        self.settings = get_settings()
        self._client: Optional[redis.Redis] = None

    @property
    def client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.from_url(
                self.settings.REDIS_URL,
                decode_responses=True
            )
        return self._client

    def _session_key(self, session_id: str) -> str:
        return f"session:{session_id}"

    def create(self) -> str:
        session_id = str(uuid.uuid4())
        session_data = {
            "session_id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "step": "upload",
            "original_image_base64": None,
            "image_width": None,
            "image_height": None,
            "components": [],
            "materials": {},
            "visualization_base64": None,
            "estimate": None,
        }
        self.client.setex(
            self._session_key(session_id),
            timedelta(hours=self.settings.SESSION_TTL_HOURS),
            json.dumps(session_data)
        )
        return session_id

    def get(self, session_id: str) -> Optional[Dict[str, Any]]:
        data = self.client.get(self._session_key(session_id))
        if data:
            session = json.loads(data)
            self.client.expire(self._session_key(session_id), timedelta(hours=self.settings.SESSION_TTL_HOURS))
            return session
        return None

    def update(self, session_id: str, updates: Dict[str, Any]) -> bool:
        session = self.get(session_id)
        if not session:
            return False
        session.update(updates)
        session["updated_at"] = datetime.utcnow().isoformat()
        self.client.setex(
            self._session_key(session_id),
            timedelta(hours=self.settings.SESSION_TTL_HOURS),
            json.dumps(session)
        )
        return True

    def delete(self, session_id: str) -> bool:
        return bool(self.client.delete(self._session_key(session_id)))


session_store = SessionStore()