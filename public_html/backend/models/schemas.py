from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class TTSProvider(str, Enum):
    voxcpm = "voxcpm"
    kittentts = "kittentts"
    edge_tts = "edge_tts"
    gtts = "gtts"


class STTProvider(str, Enum):
    whisper = "whisper"
    vosk = "vosk"


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
    language: str = Field(default="en", max_length=10)
    voice: str = Field(default="default")
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    provider: TTSProvider = TTSProvider.edge_tts
    voice_description: Optional[str] = None
    reference_audio: Optional[str] = None


class TTSResponse(BaseModel):
    audio_base64: str
    sample_rate: int
    duration_seconds: float
    format: str = "wav"
    text_preview: str
    language: str
    voice_used: str
    cached: bool = False


class STTRequest(BaseModel):
    language: str = Field(default="en", max_length=10)
    provider: STTProvider = STTProvider.whisper
    model_size: str = Field(default="base", pattern="^(tiny|base|small|medium|large)$")


class STTResponse(BaseModel):
    text: str
    confidence: float
    language: str
    segments: List[dict] = []


class DocumentUploadResponse(BaseModel):
    filename: str
    pages: int
    content_preview: str
    total_characters: int
    language: str
    formats_detected: List[str]


class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "auto"
    target_lang: str = "en"


class TranslateResponse(BaseModel):
    translated_text: str
    source_lang: str
    target_lang: str
    confidence: float = 1.0


class StreamingTTSOptions(BaseModel):
    chunk_size: int = Field(default=200, ge=50, le=2000)
    overlap: int = Field(default=50, ge=0, le=500)


class AudioTranslateResponse(BaseModel):
    transcription: str
    translated_text: str
    source_lang: str
    target_lang: str
    audio_base64: str
    sample_rate: int
    duration_seconds: float
    tts_voice_used: str
 