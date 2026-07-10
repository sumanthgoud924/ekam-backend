import io
import json
import base64
import uuid
import time
import asyncio
import traceback
from pathlib import Path
from typing import Optional
from datetime import datetime

import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from loguru import logger

from config import (
    DATA_DIR, UPLOAD_DIR, AUDIO_DIR, SUPPORTED_LANGUAGES,
    SUPPORTED_DOC_FORMATS, MAX_FILE_SIZE, CORS_ORIGINS,
)
from models.schemas import (
    TTSRequest, TTSResponse, STTRequest, STTResponse,
    DocumentUploadResponse, TranslateRequest, TranslateResponse,
    AudioTranslateResponse,
)
from tts.engine import TTSEngine
from stt.engine import STTEngine
from documents.parser import DocumentParser
from translate.engine import TranslationEngine
try:
    from tools.router import router as tools_router
    TOOLS_AVAILABLE = True
except Exception:
    TOOLS_AVAILABLE = False

from routes.ai import router as ai_router
from routes.auth import router as auth_router
from database import init_db

LIBRARY_PATH = DATA_DIR / "library.json"

app = FastAPI(
    title="Ekam Tools API",
    description="Multi-purpose TTS/STT/Document/Translation API",
    version="2.0.0",
)

if TOOLS_AVAILABLE:
    app.include_router(tools_router)

app.include_router(ai_router)
app.include_router(auth_router)

@app.on_event("startup")
async def startup_event():
    try:
        await init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https?://(.*\.)?(ekam\.digital|localhost)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({duration:.3f}s)")
    return response


@app.middleware("http")
async def catch_errors(request: Request, call_next):
    try:
        return await call_next(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unhandled error: {request.method} {request.url.path}: {e}\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "error": str(e)},
        )


tts_engine = TTSEngine()
stt_engine = STTEngine()
doc_parser = DocumentParser()
translator = TranslationEngine()


def _load_library() -> list:
    if LIBRARY_PATH.exists():
        try:
            return json.loads(LIBRARY_PATH.read_text("utf-8"))
        except (json.JSONDecodeError, OSError):
            return []
    return []


def _save_library(entries: list):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LIBRARY_PATH.write_text(json.dumps(entries, indent=2, ensure_ascii=False), "utf-8")


# ── Health ───────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    try:
        from ai_client import MODELS
        ai_ok = len(MODELS) > 0
    except Exception:
        ai_ok = False
    return {
        "status": "ok",
        "version": "2.0.0",
        "ai_enabled": ai_ok,
        "voxcpm_available": tts_engine.voxcpm_model is not None,
        "kittentts_available": tts_engine.kitten_model is not None,
        "languages_available": len(SUPPORTED_LANGUAGES),
        "doc_formats_supported": len(SUPPORTED_DOC_FORMATS),
    }


# ── Languages ────────────────────────────────────────────────────────
@app.get("/api/languages")
async def get_languages():
    return {"languages": SUPPORTED_LANGUAGES}


@app.get("/api/languages/tts")
async def get_tts_languages():
    edge_langs = {
        "en": "English", "zh": "Chinese", "hi": "Hindi", "es": "Spanish",
        "fr": "French", "de": "German", "ja": "Japanese", "ko": "Korean",
        "pt": "Portuguese", "ru": "Russian", "ar": "Arabic", "it": "Italian",
        "nl": "Dutch", "pl": "Polish", "sv": "Swedish", "tr": "Turkish",
        "th": "Thai", "vi": "Vietnamese", "id": "Indonesian", "ms": "Malay",
    }
    return {"languages": edge_langs}


@app.get("/api/voices")
async def get_voices(provider: Optional[str] = None):
    providers_order = ["edge_tts", "gtts"]
    if tts_engine.voxcpm_model is not None:
        providers_order.insert(0, "voxcpm")
    if tts_engine.kitten_model is not None:
        providers_order.insert(0, "kittentts")
    if provider:
        providers_order = [provider]
    result = {}
    for p in providers_order:
        voices = tts_engine.get_voices(p)
        result[p] = voices
    return {"providers": result}


async def synthesize_with_cascade(req: TTSRequest, cached: bool = False):
    providers_cascade = [req.provider.value, "edge_tts", "gtts"]
    providers_cascade = list(dict.fromkeys(providers_cascade))
    
    last_error = None
    for prov in providers_cascade:
        try:
            logger.info(f"Attempting synthesis with provider: {prov}")
            if cached:
                audio_bytes, sample_rate, duration, was_cached = await tts_engine.synthesize_cached(
                    text=req.text,
                    language=req.language,
                    voice=req.voice if prov == req.provider.value else "default",
                    speed=req.speed,
                    provider=prov,
                    voice_description=req.voice_description if prov == req.provider.value else None,
                    reference_audio=req.reference_audio if prov == req.provider.value else None,
                )
                return audio_bytes, sample_rate, duration, prov, was_cached
            else:
                audio_bytes, sample_rate, duration = await tts_engine.synthesize(
                    text=req.text,
                    language=req.language,
                    voice=req.voice if prov == req.provider.value else "default",
                    speed=req.speed,
                    provider=prov,
                    voice_description=req.voice_description if prov == req.provider.value else None,
                    reference_audio=req.reference_audio if prov == req.provider.value else None,
                )
                return audio_bytes, sample_rate, duration, prov, False
        except Exception as e:
            logger.warning(f"TTS provider '{prov}' failed: {e}. Trying next...")
            last_error = e
            continue
    raise last_error if last_error else Exception("All TTS providers failed")


# ── TTS ──────────────────────────────────────────────────────────────
@app.post("/api/tts", response_model=TTSResponse)
async def text_to_speech(req: TTSRequest):
    try:
        audio_bytes, sample_rate, duration, provider_used, _ = await synthesize_with_cascade(req, cached=False)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        return TTSResponse(
            audio_base64=audio_b64,
            sample_rate=sample_rate,
            duration_seconds=round(duration, 2),
            text_preview=req.text[:200],
            language=req.language,
            voice_used=req.voice if provider_used == req.provider.value else "default",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tts/cached", response_model=TTSResponse)
async def text_to_speech_cached(req: TTSRequest):
    try:
        audio_bytes, sample_rate, duration, provider_used, was_cached = await synthesize_with_cascade(req, cached=True)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        return TTSResponse(
            audio_base64=audio_b64,
            sample_rate=sample_rate,
            duration_seconds=round(duration, 2),
            text_preview=req.text[:200],
            language=req.language,
            voice_used=req.voice if provider_used == req.provider.value else "default",
            cached=was_cached,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tts/stream")
async def text_to_speech_stream(req: TTSRequest):
    try:
        audio_bytes, sample_rate, duration, _, _ = await synthesize_with_cascade(req, cached=False)
        async def iter_audio():
            chunk_size = 8192
            for i in range(0, len(audio_bytes), chunk_size):
                yield audio_bytes[i:i + chunk_size]
                await asyncio.sleep(0.01)
        return StreamingResponse(
            iter_audio(),
            media_type="audio/wav",
            headers={
                "X-Sample-Rate": str(sample_rate),
                "X-Duration": str(duration),
                "Content-Disposition": 'attachment; filename="speech.wav"',
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/api/tts/ws")
async def tts_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        data = await websocket.receive_json()
        text = data.get("text", "")
        language = data.get("language", "en")
        voice = data.get("voice", "default")
        speed = data.get("speed", 1.0)
        provider = data.get("provider", "edge_tts")
        chunk_size = data.get("chunk_size", 200)
        async for audio_chunk, sr, dur in tts_engine.synthesize_streaming(
            text=text, language=language, voice=voice,
            speed=speed, provider=provider, chunk_size=chunk_size,
        ):
            chunk_b64 = base64.b64encode(audio_chunk).decode("utf-8")
            await websocket.send_json({
                "type": "audio",
                "data": chunk_b64,
                "sample_rate": sr,
                "duration": dur,
            })
        await websocket.send_json({"type": "done"})
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        await websocket.send_json({"type": "error", "detail": str(e)})


# ── STT ──────────────────────────────────────────────────────────────
@app.post("/api/stt", response_model=STTResponse)
async def speech_to_text(
    audio: UploadFile = File(...),
    language: str = Form("en"),
    model_size: str = Form("base"),
):
    try:
        audio_data = await audio.read()
        if len(audio_data) > MAX_FILE_SIZE:
            raise HTTPException(413, f"File too large. Max {MAX_FILE_SIZE // 1024 // 1024}MB")
        text, confidence, detected_lang, segments = await stt_engine.transcribe(
            audio_data=audio_data,
            language=language,
            model_size=model_size,
        )
        return STTResponse(
            text=text,
            confidence=round(confidence, 4),
            language=detected_lang,
            segments=segments,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/api/stt/ws")
async def stt_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        language = "en"
        model_size = "base"
        audio_chunks = []
        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type")
            if msg_type == "config":
                language = message.get("language", "en")
                model_size = message.get("model_size", "base")
                await websocket.send_json({"type": "configured", "language": language})
            elif msg_type == "audio":
                chunk_b64 = message.get("data", "")
                chunk = base64.b64decode(chunk_b64)
                audio_chunks.append(chunk)
            elif msg_type == "transcribe":
                audio_data = b"".join(audio_chunks)
                text, confidence, lang, segments = await stt_engine.transcribe(
                    audio_data=audio_data,
                    language=language,
                    model_size=model_size,
                )
                await websocket.send_json({
                    "type": "result",
                    "text": text,
                    "confidence": confidence,
                    "language": lang,
                    "segments": segments,
                })
                audio_chunks = []
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        logger.info("STT WebSocket disconnected")


# ── Document Parsing ────────────────────────────────────────────────
@app.post("/api/document/upload", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(413, f"File too large. Max {MAX_FILE_SIZE // 1024 // 1024}MB")
        ext = Path(file.filename).suffix.lower()
        if ext not in doc_parser.SUPPORTED_EXTENSIONS:
            raise HTTPException(
                400,
                f"Unsupported format '{ext}'. Supported: {', '.join(sorted(doc_parser.SUPPORTED_EXTENSIONS))}"
            )
        save_path = UPLOAD_DIR / file.filename
        with open(save_path, "wb") as f:
            f.write(content)
        result = await doc_parser.parse(save_path)
        return DocumentUploadResponse(
            filename=file.filename,
            pages=result["pages"],
            content_preview=result["content"][:500],
            total_characters=result["total_characters"],
            language=result["language"],
            formats_detected=result["formats_detected"],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/document/chapters")
async def get_document_chapters(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(413, f"File too large. Max {MAX_FILE_SIZE // 1024 // 1024}MB")
        ext = Path(file.filename).suffix.lower()
        if ext not in doc_parser.SUPPORTED_EXTENSIONS:
            raise HTTPException(
                400,
                f"Unsupported format '{ext}'. Supported: {', '.join(sorted(doc_parser.SUPPORTED_EXTENSIONS))}"
            )
        save_path = UPLOAD_DIR / file.filename
        with open(save_path, "wb") as f:
            f.write(content)
        chapters = await doc_parser.parse_with_chapters(save_path)
        return {"filename": file.filename, "chapters": chapters, "total_chapters": len(chapters)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/document/{filename}")
async def get_document_content(filename: str, page: Optional[int] = None):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    result = await doc_parser.parse(file_path)
    if page is not None:
        page_detail = next((p for p in result.get("page_details", []) if p.get("page") == page), None)
        if page_detail:
            return {"page": page, "content": page_detail["text"]}
        raise HTTPException(404, f"Page {page} not found")
    return result


@app.get("/api/documents")
async def list_documents():
    files = []
    for f in UPLOAD_DIR.iterdir():
        if f.is_file() and f.suffix.lower() in doc_parser.SUPPORTED_EXTENSIONS:
            files.append({
                "filename": f.name,
                "size": f.stat().st_size,
                "format": f.suffix.lower(),
            })
    return {"files": files}


# ── Library ──────────────────────────────────────────────────────────
@app.get("/api/library")
async def list_library():
    return {"entries": _load_library()}


@app.post("/api/library")
async def add_library_entry(entry: dict):
    library = _load_library()
    new_entry = {
        "id": str(uuid.uuid4()),
        "filename": entry.get("filename", ""),
        "title": entry.get("title", entry.get("filename", "Untitled")),
        "last_read_page": entry.get("last_read_page", 1),
        "bookmark": entry.get("bookmark", ""),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    library.append(new_entry)
    _save_library(library)
    return new_entry


@app.put("/api/library/{entry_id}")
async def update_library_entry(entry_id: str, update: dict):
    library = _load_library()
    for entry in library:
        if entry.get("id") == entry_id:
            if "title" in update:
                entry["title"] = update["title"]
            if "last_read_page" in update:
                entry["last_read_page"] = update["last_read_page"]
            if "bookmark" in update:
                entry["bookmark"] = update["bookmark"]
            if "filename" in update:
                entry["filename"] = update["filename"]
            entry["updated_at"] = datetime.utcnow().isoformat()
            _save_library(library)
            return entry
    raise HTTPException(404, "Library entry not found")


@app.delete("/api/library/{entry_id}")
async def delete_library_entry(entry_id: str):
    library = _load_library()
    filtered = [e for e in library if e.get("id") != entry_id]
    if len(filtered) == len(library):
        raise HTTPException(404, "Library entry not found")
    _save_library(filtered)
    return {"deleted": True, "id": entry_id}


# ── OCR ──────────────────────────────────────────────────────────────
@app.post("/api/ocr")
async def ocr_image(file: UploadFile = File(...)):
    try:
        from PIL import Image
        import pytesseract
        image_data = await file.read()
        img = Image.open(io.BytesIO(image_data))
        text = pytesseract.image_to_string(img)
        return {"text": text.strip(), "filename": file.filename, "characters": len(text.strip())}
    except ImportError:
        raise HTTPException(500, "OCR requires pytesseract and Pillow")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Translation ──────────────────────────────────────────────────────
@app.post("/api/translate", response_model=TranslateResponse)
async def translate_text(req: TranslateRequest):
    try:
        translated_text, detected_source, confidence = await translator.translate(
            text=req.text,
            source_lang=req.source_lang,
            target_lang=req.target_lang,
        )
        return TranslateResponse(
            translated_text=translated_text,
            source_lang=detected_source,
            target_lang=req.target_lang,
            confidence=round(confidence, 4),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Audio Translation ──────────────────────────────────────────────
@app.post("/api/audio/translate", response_model=AudioTranslateResponse)
async def audio_translate(
    audio: UploadFile = File(...),
    source_lang: str = Form("auto"),
    target_lang: str = Form("en"),
    tts_provider: str = Form("edge_tts"),
    tts_voice: str = Form("default"),
):
    try:
        audio_data = await audio.read()
        if len(audio_data) > MAX_FILE_SIZE:
            raise HTTPException(413, f"File too large. Max {MAX_FILE_SIZE // 1024 // 1024}MB")

        step = "transcribing"
        audio_lang = source_lang if source_lang != "auto" else "en"
        transcribed, confidence, detected_lang, segments = await stt_engine.transcribe(
            audio_data=audio_data,
            language=audio_lang,
            model_size="base",
        )
        if not transcribed.strip():
            raise HTTPException(400, "No speech detected in audio")

        step = "translating"
        translated_text, final_source, _ = await translator.translate(
            text=transcribed,
            source_lang=detected_lang if source_lang == "auto" else source_lang,
            target_lang=target_lang,
        )

        step = "synthesizing"
        tts_lang = target_lang
        audio_bytes, sample_rate, duration = await tts_engine.synthesize(
            text=translated_text,
            language=tts_lang,
            voice=tts_voice,
            speed=1.0,
            provider=tts_provider,
        )

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        return AudioTranslateResponse(
            transcription=transcribed,
            translated_text=translated_text,
            source_lang=final_source,
            target_lang=target_lang,
            audio_base64=audio_b64,
            sample_rate=sample_rate,
            duration_seconds=round(duration, 2),
            tts_voice_used=tts_voice,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audio translate failed at step '{step}': {e}")
        raise HTTPException(status_code=500, detail=f"{step}: {str(e)}")


# ── Batch Operations ────────────────────────────────────────────────
@app.post("/api/batch/tts")
async def batch_tts(requests: list[TTSRequest]):
    tasks = []
    for req in requests:
        tasks.append(tts_engine.synthesize(
            text=req.text,
            language=req.language,
            voice=req.voice,
            speed=req.speed,
            provider=req.provider.value,
        ))
    results = await asyncio.gather(*tasks, return_exceptions=True)
    responses = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            responses.append({"index": i, "error": str(result)})
        else:
            audio_bytes, sr, dur = result
            responses.append({
                "index": i,
                "audio_base64": base64.b64encode(audio_bytes).decode("utf-8"),
                "sample_rate": sr,
                "duration": dur,
            })
    return {"results": responses}


# ── Frontend Static Files ───────────────────────────────────────────
frontend_dir = Path(__file__).parent.parent / "frontend" / "build"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")


if __name__ == "__main__":
    logger.info("Starting Ekam Tools API v2.1.0...")
    logger.info(f"  VoxCPM: {'available' if tts_engine.voxcpm_model is not None else 'not installed'}")
    logger.info(f"  KittenTTS: {'available' if tts_engine.kitten_model is not None else 'not installed'}")
    logger.info(f"  Edge-TTS: available")
    logger.info(f"  Languages: {len(SUPPORTED_LANGUAGES)}")
    logger.info(f"  Doc formats: {len(SUPPORTED_DOC_FORMATS)}")
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
