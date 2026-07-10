import asyncio
import logging
from typing import Optional

from config import SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)


class TranslationEngine:
    def __init__(self):
        self._deep_translator_available = True
        self._google_trans_available = True

    def get_supported_languages(self) -> dict:
        return SUPPORTED_LANGUAGES

    async def translate(
        self,
        text: str,
        source_lang: str = "auto",
        target_lang: str = "en",
    ) -> tuple[str, str, float]:
        text = text.strip()
        if not text:
            raise ValueError("Text cannot be empty")

        if source_lang == target_lang and source_lang != "auto":
            return text, source_lang, 1.0

        try:
            return await self._translate_deep(text, source_lang, target_lang)
        except Exception as e:
            logger.warning(f"Deep translator failed: {e}, trying Google Translate")

        raise RuntimeError("All translation backends failed")

    async def _translate_deep(
        self, text: str, source_lang: str, target_lang: str
    ) -> tuple[str, str, float]:
        from deep_translator import GoogleTranslator

        loop = asyncio.get_event_loop()

        def _translate():
            src = source_lang if source_lang != "auto" else "auto"
            translator = GoogleTranslator(source=src, target=target_lang)
            return translator.translate(text)

        translated = await loop.run_in_executor(None, _translate)

        detected_source = source_lang
        if source_lang == "auto":
            try:
                import langdetect
                detected_source = langdetect.detect(text)
            except Exception:
                detected_source = target_lang

        return translated, detected_source, 0.95

    def detect_language(self, text: str) -> str:
        try:
            import langdetect
            return langdetect.detect(text)
        except Exception:
            return "en"
