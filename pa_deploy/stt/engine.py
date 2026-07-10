import io
import asyncio
import logging
import tempfile
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


class STTEngine:
    def __init__(self):
        self.whisper_model = None
        self.vosk_model = None
        self._init_models()

    def _init_models(self):
        try:
            import whisper
            logger.info("Whisper library available")
        except ImportError:
            logger.warning("Whisper not installed. Install with: pip install openai-whisper")

    async def transcribe(
        self,
        audio_data: bytes,
        language: str = "en",
        provider: str = "whisper",
        model_size: str = "base",
    ) -> tuple[str, float, str, list]:
        if provider == "whisper":
            return await self._transcribe_whisper(audio_data, language, model_size)
        else:
            return await self._transcribe_whisper(audio_data, language, model_size)

    async def _transcribe_whisper(
        self, audio_data: bytes, language: str, model_size: str
    ) -> tuple[str, float, str, list]:
        import whisper

        loop = asyncio.get_event_loop()
        model_name = model_size or "base"

        if self.whisper_model is None or (
            hasattr(self.whisper_model, "_model_name") and self.whisper_model._model_name != model_name
        ):
            def _load():
                m = whisper.load_model(model_name)
                m._model_name = model_name
                return m
            self.whisper_model = await loop.run_in_executor(None, _load)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        try:
            def _transcribe():
                lang = None if language == "auto" else language
                return self.whisper_model.transcribe(
                    tmp_path,
                    language=lang,
                    task="transcribe",
                    fp16=False,
                )

            result = await loop.run_in_executor(None, _transcribe)
            text = result.get("text", "").strip()
            detected_lang = result.get("language", language)
            segments = [
                {
                    "start": seg["start"],
                    "end": seg["end"],
                    "text": seg["text"].strip(),
                }
                for seg in result.get("segments", [])
            ]
            avg_confidence = (
                sum(s.get("avg_logprob", 0) for s in result.get("segments", []))
                / max(len(result.get("segments", [])), 1)
            )
            confidence = max(0, min(1, (avg_confidence + 2) / 4))

            return text, confidence, detected_lang, segments
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    async def transcribe_streaming(
        self,
        audio_chunks: list[bytes],
        language: str = "en",
        model_size: str = "base",
    ) -> str:
        full_text_parts = []
        for chunk in audio_chunks:
            text, confidence, lang, segments = await self.transcribe(
                chunk, language=language, provider="whisper", model_size=model_size
            )
            if text:
                full_text_parts.append(text)
        return " ".join(full_text_parts)
