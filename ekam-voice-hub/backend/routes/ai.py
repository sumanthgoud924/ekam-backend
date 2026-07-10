"""AI-powered endpoints using NVIDIA NIM."""
import base64
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ai_client import get_ai_client


router = APIRouter(prefix="/api/ai", tags=["AI"])


class ChatRequest(BaseModel):
    messages: list[dict]
    model: Optional[str] = None
    system_prompt: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    stream: bool = False


class SummarizeRequest(BaseModel):
    text: str
    max_length: int = 200


class EnhanceTranslateRequest(BaseModel):
    text: str
    source_lang: str = "auto"
    target_lang: str = "en"


# ── Chat Completion ──────────────────────────────────────────────────
@router.post("/chat")
async def ai_chat(req: ChatRequest):
    """General chat completion via NVIDIA NIM."""
    if not req.messages or not req.messages[-1].get("content"):
        raise HTTPException(400, "Message content is required")

    client = get_ai_client()

    if req.stream:
        async def generate():
            async for chunk in await client.chat(
                messages=req.messages,
                model=req.model,
                system_prompt=req.system_prompt,
                max_tokens=req.max_tokens,
                temperature=req.temperature,
                stream=True,
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    try:
        result = await client.chat(
            messages=req.messages,
            model=req.model,
            system_prompt=req.system_prompt,
            max_tokens=req.max_tokens,
            temperature=req.temperature,
        )
        return result
    except RuntimeError as e:
        raise HTTPException(503, str(e))


# ── Summarization ────────────────────────────────────────────────────
@router.post("/summarize")
async def ai_summarize(req: SummarizeRequest):
    """Summarize text using AI."""
    if not req.text.strip():
        raise HTTPException(400, "Text is required")
    if len(req.text) < 20:
        raise HTTPException(400, "Text too short to summarize (min 20 chars)")

    client = get_ai_client()
    try:
        summary = await client.summarize(req.text, req.max_length)
        return {
            "summary": summary,
            "original_length": len(req.text),
            "summary_length": len(summary),
        }
    except RuntimeError as e:
        raise HTTPException(503, str(e))


# ── AI-Enhanced Translation ──────────────────────────────────────────
@router.post("/enhance-translate")
async def ai_enhance_translate(req: EnhanceTranslateRequest):
    """AI-enhanced translation with better context understanding."""
    if not req.text.strip():
        raise HTTPException(400, "Text is required")

    client = get_ai_client()
    try:
        enhanced = await client.enhance_translation(
            text=req.text,
            source_lang=req.source_lang,
            target_lang=req.target_lang,
        )
        return {
            "translated_text": enhanced,
            "source_lang": req.source_lang,
            "target_lang": req.target_lang,
        }
    except RuntimeError as e:
        raise HTTPException(503, str(e))


# ── Image Analysis ────────────────────────────────────────────────────
@router.post("/describe-image")
async def ai_describe_image(
    file: UploadFile = File(...),
    prompt: str = Form("Describe this image in detail"),
):
    """Analyze an image using multimodal AI (MiniMax-M3)."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    image_data = await file.read()
    if len(image_data) > 10 * 1024 * 1024:
        raise HTTPException(413, "Image too large. Max 10MB")

    client = get_ai_client()
    try:
        description = await client.describe_image(image_data, prompt)
        return {
            "description": description,
            "filename": file.filename,
            "model": "minimaxai/minimax-m3",
        }
    except RuntimeError as e:
        raise HTTPException(503, str(e))


# ── Available Models ──────────────────────────────────────────────────
@router.get("/models")
async def list_ai_models():
    """List all available AI models."""
    from ai_client import MODELS
    return {
        "models": [
            {
                "id": key,
                "name": cfg["model"],
                "description": cfg.get("description", ""),
                "max_tokens": cfg.get("max_tokens", 2048),
                "multimodal": cfg.get("multimodal", False),
            }
            for key, cfg in MODELS.items()
        ]
    }
