"""Text-to-speech for REX's spoken replies, via ElevenLabs.

Kept intentionally small and side-effect-free: given text, return MP3 bytes — or
None when no key is configured or the call fails, which is the signal for the
frontend to fall back to the browser's own voice. Using ElevenLabs' multilingual
model so Hindi / Hinglish replies sound human.
"""

from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"


def synthesize(
    text: str,
    *,
    api_key: str | None = None,
    voice_id: str | None = None,
    model: str | None = None,
) -> bytes | None:
    key = api_key if api_key is not None else settings.elevenlabs_api_key
    if not key or not text.strip():
        return None
    voice = voice_id or settings.elevenlabs_voice_id
    url = _ENDPOINT.format(voice_id=voice)
    try:
        resp = httpx.post(
            url,
            headers={"xi-api-key": key, "content-type": "application/json"},
            json={
                "text": text,
                "model_id": model or settings.elevenlabs_model,
                "voice_settings": {"stability": 0.4, "similarity_boost": 0.85},
            },
            timeout=30.0,
        )
        if resp.status_code == 200:
            return resp.content
        logger.warning("ElevenLabs TTS failed (%s): %s", resp.status_code, resp.text[:200])
    except Exception as exc:  # network/SDK error → browser fallback
        logger.warning("ElevenLabs TTS error (%s); frontend will use browser voice.", exc)
    return None
