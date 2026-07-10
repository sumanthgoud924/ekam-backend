import io
import re
import base64
import asyncio
import hashlib
import logging
import tempfile
from pathlib import Path
from collections import OrderedDict
from typing import Optional, List, AsyncGenerator

import numpy as np

from config import (
    VoxCPM_AVAILABLE, KITTEN_TTS_AVAILABLE,
    AUDIO_DIR, SUPPORTED_LANGUAGES
)

logger = logging.getLogger(__name__)


class TTSEngine:
    def __init__(self):
        self.voxcpm_model = None
        self.kitten_model = None
        self.edge_tts_available = True
        self._cache = OrderedDict()
        self._max_cache_size = 100
        self._init_models()

    def _make_cache_key(
        self, text: str, language: str, voice: str,
        speed: float, provider: str, voice_description: Optional[str],
        reference_audio: Optional[str],
    ) -> str:
        raw = f"{text}|{language}|{voice}|{speed}|{provider}|{voice_description}|{reference_audio}"
        return hashlib.md5(raw.encode("utf-8")).hexdigest()

    def _get_from_cache(self, key: str):
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        return None

    def _set_cache(self, key: str, value: tuple):
        self._cache[key] = value
        self._cache.move_to_end(key)
        if len(self._cache) > self._max_cache_size:
            self._cache.popitem(last=False)

    def _preprocess_text(self, text: str) -> str:
        expansions = {
            r'\bDr\.': 'Doctor', r'\bMr\.': 'Mister', r'\bMrs\.': 'Misses',
            r'\bMs\.': 'Ms', r'\bProf\.': 'Professor', r'\bSt\.': 'Street',
            r'\bAve\.': 'Avenue', r'\bBlvd\.': 'Boulevard', r'\bRd\.': 'Road',
            r'\bLn\.': 'Lane', r'\bvs\.': 'versus', r'\betc\.': 'etcetera',
            r'\be\.g\.': 'for example', r'\bi\.e\.': 'that is',
        }
        for pattern, replacement in expansions.items():
            text = re.sub(pattern, replacement, text)
        text = re.sub(r'(\d{1,3})(,\d{3})+', lambda m: m.group(0).replace(",", ""), text)
        return text

    def _chunk_text(self, text: str, max_chars: int = 5000) -> list[str]:
        if len(text) <= max_chars:
            return [text]
        sentences = re.split(r'(?<=[.!?])\s+', text)
        chunks = []
        current = ""
        for sentence in sentences:
            if len(current) + len(sentence) > max_chars and current:
                chunks.append(current.strip())
                current = sentence
            else:
                current += " " + sentence if current else sentence
        if current.strip():
            chunks.append(current.strip())
        return chunks

    async def synthesize_cached(
        self,
        text: str,
        language: str = "en",
        voice: str = "default",
        speed: float = 1.0,
        provider: str = "edge_tts",
        voice_description: Optional[str] = None,
        reference_audio: Optional[str] = None,
    ) -> tuple[bytes, int, float, bool]:
        key = self._make_cache_key(text, language, voice, speed, provider, voice_description, reference_audio)
        cached = self._get_from_cache(key)
        if cached is not None:
            logger.info(f"TTS cache hit for key={key[:12]}...")
            return (*cached, True)
        result = await self.synthesize(text, language, voice, speed, provider, voice_description, reference_audio)
        self._set_cache(key, result)
        return (*result, False)

    def _init_models(self):
        if VoxCPM_AVAILABLE:
            try:
                from voxcpm import VoxCPM
                self.voxcpm_model = VoxCPM.from_pretrained(
                    "openbmb/VoxCPM2",
                    load_denoiser=False,
                )
                logger.info("VoxCPM2 model loaded")
            except Exception as e:
                logger.warning(f"Failed to load VoxCPM2: {e}")
        if KITTEN_TTS_AVAILABLE:
            try:
                from kittentts import KittenTTS
                self.kitten_model = KittenTTS("KittenML/kitten-tts-nano-0.8")
                logger.info("KittenTTS model loaded")
            except Exception as e:
                logger.warning(f"Failed to load KittenTTS: {e}")

    EDGE_VOICE_METADATA = {
        "en-US-AriaNeural": {"locale": "en-US", "gender": "Female", "description": "Aria - Female, Expressive"},
        "en-US-GuyNeural": {"locale": "en-US", "gender": "Male", "description": "Guy - Male, Natural"},
        "en-GB-SoniaNeural": {"locale": "en-GB", "gender": "Female", "description": "Sonia - Female, British"},
        "en-GB-RyanNeural": {"locale": "en-GB", "gender": "Male", "description": "Ryan - Male, British"},
        "en-IN-NeerjaNeural": {"locale": "en-IN", "gender": "Female", "description": "Neerja - Female, Indian"},
        "en-AU-NatashaNeural": {"locale": "en-AU", "gender": "Female", "description": "Natasha - Female, Australian"},
        "zh-CN-XiaoxiaoNeural": {"locale": "zh-CN", "gender": "Female", "description": "Xiaoxiao - Female, Mandarin"},
        "hi-IN-SwaraNeural": {"locale": "hi-IN", "gender": "Female", "description": "Swara - Female, Hindi"},
        "es-ES-ElviraNeural": {"locale": "es-ES", "gender": "Female", "description": "Elvira - Female, Spanish"},
        "fr-FR-DeniseNeural": {"locale": "fr-FR", "gender": "Female", "description": "Denise - Female, French"},
        "de-DE-KatjaNeural": {"locale": "de-DE", "gender": "Female", "description": "Katja - Female, German"},
        "ja-JP-NanamiNeural": {"locale": "ja-JP", "gender": "Female", "description": "Nanami - Female, Japanese"},
        "ko-KR-SunHiNeural": {"locale": "ko-KR", "gender": "Female", "description": "Sun-Hi - Female, Korean"},
        "pt-BR-FranciscaNeural": {"locale": "pt-BR", "gender": "Female", "description": "Francisca - Female, Portuguese"},
        "ru-RU-SvetlanaNeural": {"locale": "ru-RU", "gender": "Female", "description": "Svetlana - Female, Russian"},
        "ar-SA-ZariyahNeural": {"locale": "ar-SA", "gender": "Female", "description": "Zariyah - Female, Arabic"},
        "it-IT-ElsaNeural": {"locale": "it-IT", "gender": "Female", "description": "Elsa - Female, Italian"},
        "nl-NL-ColetteNeural": {"locale": "nl-NL", "gender": "Female", "description": "Colette - Female, Dutch"},
        "pl-PL-ZofiaNeural": {"locale": "pl-PL", "gender": "Female", "description": "Zofia - Female, Polish"},
        "sv-SE-SofieNeural": {"locale": "sv-SE", "gender": "Female", "description": "Sofie - Female, Swedish"},
        "tr-TR-EmelNeural": {"locale": "tr-TR", "gender": "Female", "description": "Emel - Female, Turkish"},
        "th-TH-PremwadeeNeural": {"locale": "th-TH", "gender": "Female", "description": "Premwadee - Female, Thai"},
        "vi-VN-HoaiMyNeural": {"locale": "vi-VN", "gender": "Female", "description": "Hoai My - Female, Vietnamese"},
        "id-ID-GadisNeural": {"locale": "id-ID", "gender": "Female", "description": "Gadis - Female, Indonesian"},
        "ms-MY-YasminNeural": {"locale": "ms-MY", "gender": "Female", "description": "Yasmin - Female, Malay"},
    }

    def _get_available_voices(self, provider: str) -> list:
        if provider == "voxcpm" and self.voxcpm_model is not None:
            return [
                {"name": "default", "locale": "en", "gender": "Any", "description": "Default voice"},
                {"name": "young_woman", "locale": "en", "gender": "Female", "description": "Young woman, gentle"},
                {"name": "adult_male", "locale": "en", "gender": "Male", "description": "Adult male, deep"},
                {"name": "elderly", "locale": "en", "gender": "Male", "description": "Elderly, warm"},
                {"name": "cheerful", "locale": "en", "gender": "Female", "description": "Cheerful, bright"},
                {"name": "serious", "locale": "en", "gender": "Male", "description": "Serious, authoritative"},
            ]
        if provider == "kittentts" and self.kitten_model is not None:
            return [
                {"name": n, "locale": "en", "gender": "Any", "description": f"{n} - KittenTTS voice"}
                for n in ["Bella", "Jasper", "Luna", "Bruno", "Rosie", "Hugo", "Kiki", "Leo"]
            ]
        if provider == "edge_tts":
            return [
                {
                    "name": name,
                    "locale": meta["locale"],
                    "gender": meta["gender"],
                    "description": meta["description"],
                }
                for name, meta in self.EDGE_VOICE_METADATA.items()
            ]
        if provider == "gtts":
            return [{"name": "default", "locale": "any", "gender": "Any", "description": "gTTS default voice"}]
        return [{"name": "default", "locale": "any", "gender": "Any", "description": "Default voice"}]

    async def synthesize(
        self,
        text: str,
        language: str = "en",
        voice: str = "default",
        speed: float = 1.0,
        provider: str = "edge_tts",
        voice_description: Optional[str] = None,
        reference_audio: Optional[str] = None,
    ) -> tuple[bytes, int, float]:
        text = text.strip()
        if not text:
            raise ValueError("Text cannot be empty")

        text = self._preprocess_text(text)
        chunks = self._chunk_text(text)

        if len(chunks) == 1:
            return await self._synthesize_single(chunks[0], language, voice, speed, provider, voice_description, reference_audio)

        audio_parts = []
        total_samples = 0
        sample_rate = 24000
        for chunk in chunks:
            audio_bytes, sr, dur = await self._synthesize_single(chunk, language, voice, speed, provider, voice_description, reference_audio)
            audio_parts.append(audio_bytes)
            if sample_rate == 24000:
                sample_rate = sr
            total_samples += int(dur * sample_rate)

        combined = b"".join(audio_parts)
        duration = total_samples / sample_rate
        return combined, sample_rate, duration

    async def _synthesize_single(
        self,
        text: str,
        language: str = "en",
        voice: str = "default",
        speed: float = 1.0,
        provider: str = "edge_tts",
        voice_description: Optional[str] = None,
        reference_audio: Optional[str] = None,
    ) -> tuple[bytes, int, float]:
        if provider == "voxcpm" and self.voxcpm_model is not None:
            return await self._synthesize_voxcpm(text, language, voice, speed, voice_description, reference_audio)
        elif provider == "kittentts" and self.kitten_model is not None:
            return await self._synthesize_kittentts(text, voice, speed)
        elif provider == "edge_tts":
            return await self._synthesize_edge_tts(text, language, voice, speed)
        elif provider == "gtts":
            return await self._synthesize_gtts(text, language, speed)
        else:
            return await self._synthesize_edge_tts(text, language, voice, speed)

    async def _synthesize_voxcpm(
        self, text: str, language: str, voice: str,
        speed: float, voice_description: Optional[str],
        reference_audio: Optional[str]
    ) -> tuple[bytes, int, float]:
        import soundfile as sf
        loop = asyncio.get_event_loop()

        gen_kwargs = {
            "text": text,
            "cfg_value": 2.0,
            "inference_timesteps": 10,
            "seed": 42,
        }
        if voice_description:
            gen_kwargs["text"] = f"({voice_description}){text}"
        if reference_audio:
            gen_kwargs["reference_wav_path"] = reference_audio

        def _generate():
            return self.voxcpm_model.generate(**gen_kwargs)

        wav = await loop.run_in_executor(None, _generate)
        sample_rate = self.voxcpm_model.tts_model.sample_rate
        buffer = io.BytesIO()
        sf.write(buffer, wav, sample_rate, format="wav")
        audio_bytes = buffer.getvalue()
        duration = len(wav) / sample_rate
        return audio_bytes, sample_rate, duration

    async def _synthesize_kittentts(
        self, text: str, voice: str, speed: float
    ) -> tuple[bytes, int, float]:
        import soundfile as sf
        loop = asyncio.get_event_loop()

        if voice not in self.kitten_model.available_voices:
            voice = "Jasper"

        def _generate():
            return self.kitten_model.generate(
                text, voice=voice, speed=speed, clean_text=True
            )

        wav = await loop.run_in_executor(None, _generate)
        sample_rate = 24000
        buffer = io.BytesIO()
        sf.write(buffer, wav, sample_rate, format="wav")
        audio_bytes = buffer.getvalue()
        duration = len(wav) / sample_rate
        return audio_bytes, sample_rate, duration

    async def _synthesize_edge_tts(
        self, text: str, language: str, voice: str, speed: float
    ) -> tuple[bytes, int, float]:
        import edge_tts

        lang_map = {"en": "en-US", "zh": "zh-CN", "hi": "hi-IN", "es": "es-ES",
                     "fr": "fr-FR", "de": "de-DE", "ja": "ja-JP", "ko": "ko-KR",
                     "pt": "pt-BR", "ru": "ru-RU", "ar": "ar-SA", "it": "it-IT",
                     "nl": "nl-NL", "pl": "pl-PL", "sv": "sv-SE", "tr": "tr-TR",
                     "th": "th-TH", "vi": "vi-VN", "id": "id-ID", "ms": "ms-MY"}

        tts_lang = lang_map.get(language, "en-US")
        edge_voices = {v["name"] for v in self._get_available_voices("edge_tts")}
        if voice == "default" or voice not in edge_voices:
            voice_map = {
                "en-US": "en-US-AriaNeural", "zh-CN": "zh-CN-XiaoxiaoNeural",
                "hi-IN": "hi-IN-SwaraNeural", "es-ES": "es-ES-ElviraNeural",
                "fr-FR": "fr-FR-DeniseNeural", "de-DE": "de-DE-KatjaNeural",
                "ja-JP": "ja-JP-NanamiNeural", "ko-KR": "ko-KR-SunHiNeural",
                "pt-BR": "pt-BR-FranciscaNeural", "ru-RU": "ru-RU-SvetlanaNeural",
                "ar-SA": "ar-SA-ZariyahNeural", "it-IT": "it-IT-ElsaNeural",
            }
            voice = voice_map.get(tts_lang, "en-US-AriaNeural")

        rate_str = f"+{int((speed - 1) * 100)}%" if speed >= 1 else f"{int((speed - 1) * 100)}%"
        communicate = edge_tts.Communicate(text, voice=voice, rate=rate_str)

        audio_chunks = []
        sample_rate = 24000
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])

        audio_bytes = b"".join(audio_chunks)
        duration = len(audio_bytes) / (sample_rate * 2)
        return audio_bytes, sample_rate, duration

    async def _synthesize_gtts(
        self, text: str, language: str, speed: float
    ) -> tuple[bytes, int, float]:
        from gtts import gTTS
        loop = asyncio.get_event_loop()

        def _generate():
            tts = gTTS(text=text, lang=language, slow=(speed < 1.0))
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            return fp.read()

        audio_bytes = await loop.run_in_executor(None, _generate)
        return audio_bytes, 16000, len(audio_bytes) / (16000 * 2)

    async def synthesize_streaming(
        self,
        text: str,
        language: str = "en",
        voice: str = "default",
        speed: float = 1.0,
        provider: str = "edge_tts",
        chunk_size: int = 200,
        overlap: int = 50,
    ) -> AsyncGenerator[tuple[bytes, int, float], None]:
        import re

        sentences = re.split(r'(?<=[.!?])\s+', text)
        current_chunk = ""
        chunks = []

        for sentence in sentences:
            if len(current_chunk) + len(sentence) > chunk_size and current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = sentence
            else:
                current_chunk += " " + sentence if current_chunk else sentence

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        for i, chunk_text in enumerate(chunks):
            audio_bytes, sr, dur = await self.synthesize(
                text=chunk_text,
                language=language,
                voice=voice,
                speed=speed,
                provider=provider,
            )
            yield audio_bytes, sr, dur

    def get_voices(self, provider: str) -> list:
        return self._get_available_voices(provider)
