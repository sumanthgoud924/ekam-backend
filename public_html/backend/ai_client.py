"""
NVIDIA NIM API Client for LLM integration.
Supports chat, summarization, translation enhancement, vision, and tool calling.
"""
import json
import base64
import asyncio
from typing import Optional, AsyncGenerator
from pathlib import Path

import httpx
from loguru import logger


NVIDIA_BASE = "https://integrate.api.nvidia.com/v1"

MODELS = {
    "mistral-small": {
        "model": "mistralai/mistral-small-4-119b-2603",
        "api_key": "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",
        "max_tokens": 16384,
        "temperature": 0.10,
        "reasoning_effort": "high",
        "description": "Fast, high-quality reasoning (119B) — default",
    },
    "mistral-large": {
        "model": "mistralai/mistral-large-3-675b-instruct-2512",
        "api_key": "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",
        "max_tokens": 2048,
        "temperature": 0.15,
        "description": "Largest Mistral (675B) — best quality",
    },
    "qwen-122b": {
        "model": "qwen/qwen3.5-122b-a10b",
        "api_key": "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",
        "max_tokens": 16384,
        "temperature": 0.60,
        "description": "Balanced Qwen 3.5 (122B)",
    },
    "qwen-397b": {
        "model": "qwen/qwen3.5-397b-a17b",
        "api_key": "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",
        "max_tokens": 16384,
        "temperature": 0.60,
        "description": "Largest Qwen 3.5 (397B)",
    },
    "nemotron": {
        "model": "nvidia/nemotron-3-ultra-550b-a55b",
        "api_key": "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",
        "max_tokens": 16384,
        "temperature": 1.0,
        "enable_thinking": True,
        "description": "NVIDIA Nemotron with reasoning",
    },
    "gemma-4": {
        "model": "google/gemma-4-31b-it",
        "api_key": "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",
        "max_tokens": 16384,
        "temperature": 1.0,
        "enable_thinking": True,
        "description": "Google Gemma 4 (31B) with thinking",
    },
    "ministral": {
        "model": "mistralai/ministral-14b-instruct-2512",
        "api_key": "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",
        "max_tokens": 2048,
        "temperature": 0.15,
        "description": "Fast lightweight (14B)",
    },
    "minimax-m3": {
        "model": "minimaxai/minimax-m3",
        "api_key": "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",
        "max_tokens": 8192,
        "temperature": 1.0,
        "multimodal": True,
        "description": "Multimodal — text + image + video",
    },
}

FALLBACK_ORDER = ["mistral-small", "ministral", "qwen-122b", "mistral-large"]
TOOL_DEFS = [
    {
        "type": "function",
        "function": {
            "name": "summarize_text",
            "description": "Summarize a long piece of text",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Text to summarize"},
                    "max_words": {"type": "integer", "description": "Maximum summary length in words"},
                },
                "required": ["text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "translate_text",
            "description": "Translate text to another language",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Text to translate"},
                    "target_lang": {"type": "string", "description": "Target language code (e.g. hi, bn, te, mr)"},
                },
                "required": ["text", "target_lang"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_image",
            "description": "Generate an image from a text description (placeholder)",
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt": {"type": "string", "description": "Detailed image description"},
                },
                "required": ["prompt"],
            },
        },
    },
]


class NvidiaAIClient:
    """Client for NVIDIA NIM API with retries, fallbacks, and tool calling."""

    def __init__(self, default_model: str = "mistral-small"):
        if default_model not in MODELS:
            raise ValueError(f"Unknown model '{default_model}'. Available: {list(MODELS.keys())}")
        self.default_model = default_model
        self._client = httpx.AsyncClient(timeout=120.0, limits=httpx.Limits(max_keepalive_connections=5, max_connections=10))

    def _get_config(self, model: Optional[str] = None) -> dict:
        key = model or self.default_model
        if key not in MODELS:
            raise ValueError(f"Unknown model '{key}'")
        return MODELS[key]

    # ── Helpers ───────────────────────────────────────────────────────

    def _count_tokens(self, messages: list[dict]) -> int:
        """Rough token count estimate for context management."""
        total = 0
        for m in messages:
            content = m.get("content", "")
            if isinstance(content, str):
                total += len(content.split())
            elif isinstance(content, list):
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "text":
                        total += len(part["text"].split())
        return total

    def _truncate_context(self, messages: list[dict], max_tokens: int = 12000) -> list[dict]:
        """Truncate conversation to fit within model context window."""
        system_msgs = [m for m in messages if m.get("role") == "system"]
        other = [m for m in messages if m.get("role") != "system"]
        while other and self._count_tokens(system_msgs + other) > max_tokens:
            removed = other.pop(0)
            logger.debug(f"Truncated message: role={removed.get('role')}, content_preview={str(removed.get('content', ''))[:50]}")
        return system_msgs + other

    # ── Core Chat ─────────────────────────────────────────────────────

    async def chat(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        stream: bool = False,
        tools: Optional[list] = None,
    ) -> dict | AsyncGenerator[str, None]:
        """Send a chat completion request with retry and fallback."""
        cfg = self._get_config(model)

        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)
        full_messages = self._truncate_context(full_messages)

        payload = {
            "model": cfg["model"],
            "messages": full_messages,
            "max_tokens": max_tokens or cfg.get("max_tokens", 2048),
            "temperature": temperature if temperature is not None else cfg.get("temperature", 0.7),
            "top_p": cfg.get("top_p", 0.95),
            "stream": stream,
        }

        if cfg.get("reasoning_effort"):
            payload["reasoning_effort"] = cfg["reasoning_effort"]
        if cfg.get("enable_thinking"):
            payload["chat_template_kwargs"] = {"enable_thinking": True}
            payload["reasoning_budget"] = cfg.get("max_tokens", 4096)

        headers = {
            "Authorization": f"Bearer {cfg['api_key']}",
            "Content-Type": "application/json",
        }

        if stream:
            return self._stream_chat_with_fallback(payload, headers, model=model)
        return await self._chat_with_retry(payload, headers, model=model)

    async def _chat_with_retry(self, payload: dict, headers: dict, model: Optional[str] = None, retries: int = 2) -> dict:
        """Non-streaming chat with retry and fallback models."""
        last_error = None
        models_to_try = [model or self.default_model] + [m for m in FALLBACK_ORDER if m != (model or self.default_model)]

        for attempt, model_key in enumerate(models_to_try[:retries + 1]):
            if attempt > 0:
                logger.info(f"Retrying with model '{model_key}' (attempt {attempt + 1})")
                cfg = self._get_config(model_key)
                payload["model"] = cfg["model"]
                payload["temperature"] = temperature if (temperature := payload.get("temperature")) is not None else cfg.get("temperature", 0.7)
                headers["Authorization"] = f"Bearer {cfg['api_key']}"

            try:
                response = await self._client.post(
                    f"{NVIDIA_BASE}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()

                logger.debug(f"NVIDIA API raw response: {json.dumps(data)[:500]}")

                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                usage = data.get("usage", {})

                return {
                    "content": content,
                    "model": payload["model"],
                    "usage": {
                        "prompt_tokens": usage.get("prompt_tokens", 0),
                        "completion_tokens": usage.get("completion_tokens", 0),
                        "total_tokens": usage.get("total_tokens", 0),
                    },
                }

            except httpx.HTTPStatusError as e:
                last_error = f"HTTP {e.response.status_code}"
                logger.warning(f"Model '{model_key}' failed: {last_error}")
                if e.response.status_code == 429:
                    wait = min(2 ** attempt, 10)
                    await asyncio.sleep(wait)

            except httpx.TimeoutException:
                last_error = "timeout"
                logger.warning(f"Model '{model_key}' timed out")

            except Exception as e:
                last_error = str(e)
                logger.warning(f"Model '{model_key}' error: {e}")

        raise RuntimeError(f"AI service error: {last_error} (after {retries + 1} attempts)")

    async def _stream_chat_with_fallback(self, payload: dict, headers: dict, model: Optional[str] = None) -> AsyncGenerator[str, None]:
        """Streaming chat with robust SSE parsing and fallback."""
        models_to_try = [model or self.default_model] + [m for m in FALLBACK_ORDER if m != (model or self.default_model)]
        streamed_anything = False
        last_error = None

        for attempt, model_key in enumerate(models_to_try):
            if attempt > 0:
                if streamed_anything:
                    break
                logger.info(f"Stream fallback to '{model_key}'")
                cfg = self._get_config(model_key)
                payload["model"] = cfg["model"]
                headers["Authorization"] = f"Bearer {cfg['api_key']}"

            try:
                async with self._client.stream(
                    "POST",
                    f"{NVIDIA_BASE}/chat/completions",
                    headers=headers,
                    json=payload,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        data_str = line[6:].strip()
                        if not data_str or data_str == "[DONE]":
                            continue
                        try:
                            data = json.loads(data_str)
                            choices = data.get("choices", [])
                            if not choices:
                                continue
                            delta = choices[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                                streamed_anything = True
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
                    return

            except httpx.HTTPStatusError as e:
                last_error = f"HTTP {e.response.status_code}"
                logger.warning(f"Stream model '{model_key}' failed: {last_error}")
                if e.response.status_code == 429:
                    await asyncio.sleep(min(2 ** attempt, 10))

            except Exception as e:
                last_error = str(e)
                logger.warning(f"Stream model '{model_key}' error: {e}")

        if not streamed_anything:
            yield f"I'm sorry, I'm having trouble connecting to the AI service. Error: {last_error or 'Unknown'}. Please try again."

    # ── Summarization ──────────────────────────────────────────────────

    async def summarize(self, text: str, max_length: int = 200) -> str:
        """Summarize text using the AI with structured output."""
        result = await self._chat_with_retry(
            payload={
                "model": MODELS["mistral-small"]["model"],
                "messages": [
                    {"role": "system", "content": "You are a precise summarizer. Provide a clear, concise summary covering key points."},
                    {"role": "user", "content": f"Summarize the following text in {max_length} words or less:\n\n{text}"},
                ],
                "max_tokens": max(500, max_length * 4),
                "temperature": 0.1,
                "top_p": 0.95,
                "stream": False,
            },
            headers={"Authorization": f"Bearer {MODELS['mistral-small']['api_key']}", "Content-Type": "application/json"},
            model="mistral-small",
        )
        return result["content"]

    # ── AI-Enhanced Translation ─────────────────────────────────────────

    async def enhance_translation(self, text: str, source_lang: str, target_lang: str) -> str:
        """Use AI to improve translation quality with context awareness."""
        src = "the source" if source_lang == "auto" else source_lang
        result = await self._chat_with_retry(
            payload={
                "model": MODELS["mistral-small"]["model"],
                "messages": [
                    {"role": "system", "content": "You are a professional translator. Translate accurately, preserving tone, idioms, and cultural context. Return ONLY the translation, no explanations."},
                    {"role": "user", "content": f"Translate from {src} to {target_lang}:\n\n{text}"},
                ],
                "max_tokens": max(500, len(text.split()) * 5),
                "temperature": 0.05,
                "top_p": 0.95,
                "stream": False,
            },
            headers={"Authorization": f"Bearer {MODELS['mistral-small']['api_key']}", "Content-Type": "application/json"},
            model="mistral-small",
        )
        return result["content"]

    # ── Image Analysis ──────────────────────────────────────────────────

    async def describe_image(self, image_data: bytes, prompt: str = "Describe this image in detail") -> str:
        """Analyze an image using MiniMax-M3 multimodal."""
        b64 = base64.b64encode(image_data).decode()
        data_uri = f"data:image/jpeg;base64,{b64}"

        result = await self._chat_with_retry(
            payload={
                "model": MODELS["minimax-m3"]["model"],
                "messages": [
                    {"role": "system", "content": "You are a detailed image analyst. Describe what you see factually and comprehensively."},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": data_uri}},
                        ],
                    },
                ],
                "max_tokens": MODELS["minimax-m3"]["max_tokens"],
                "temperature": 0.2,
                "top_p": 0.95,
                "stream": False,
            },
            headers={"Authorization": f"Bearer {MODELS['minimax-m3']['api_key']}", "Content-Type": "application/json"},
            model="minimax-m3",
        )
        return result["content"]

    async def close(self):
        await self._client.aclose()


_client: Optional[NvidiaAIClient] = None


def get_ai_client() -> NvidiaAIClient:
    global _client
    if _client is None:
        _client = NvidiaAIClient()
    return _client
