import os
from pathlib import Path


APP_DIR = Path(os.getenv("APP_DIR", Path(__file__).parent))
DATA_DIR = Path(os.getenv("DATA_DIR", str(APP_DIR / "data")))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(DATA_DIR / "uploads")))
AUDIO_DIR = Path(os.getenv("AUDIO_DIR", str(DATA_DIR / "audio")))
MODELS_DIR = Path(os.getenv("MODELS_DIR", str(APP_DIR / "models" / "weights")))
DB_PATH = Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "ekam.db")))

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
MAX_TEXT_LENGTH = int(os.getenv("MAX_TEXT_LENGTH", "50000"))

# CORS Origins from environment
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "https://ekam.digital,https://www.ekam.digital,http://localhost:3000,http://localhost:5173").split(",")

SUPPORTED_LANGUAGES = {
    "en": "English", "zh": "Chinese", "hi": "Hindi", "es": "Spanish",
    "fr": "French", "de": "German", "ja": "Japanese", "ko": "Korean",
    "pt": "Portuguese", "ru": "Russian", "ar": "Arabic", "bn": "Bengali",
    "pa": "Punjabi", "mr": "Marathi", "ta": "Tamil", "te": "Telugu",
    "kn": "Kannada", "ml": "Malayalam", "gu": "Gujarati", "ur": "Urdu",
    "fa": "Persian", "tr": "Turkish", "it": "Italian", "nl": "Dutch",
    "pl": "Polish", "sv": "Swedish", "da": "Danish", "fi": "Finnish",
    "th": "Thai", "vi": "Vietnamese", "id": "Indonesian", "ms": "Malay",
}

SUPPORTED_DOC_FORMATS = {
    ".pdf": "PDF Document",
    ".docx": "Word Document",
    ".doc": "Word Document (Legacy)",
    ".txt": "Text File",
    ".pptx": "PowerPoint",
    ".xlsx": "Excel Spreadsheet",
    ".epub": "EPUB eBook",
    ".md": "Markdown",
    ".rtf": "Rich Text Format",
    ".html": "HTML Document",
    ".htm": "HTML Document",
    ".odt": "OpenDocument Text",
    ".csv": "CSV File",
    ".json": "JSON File",
    ".xml": "XML File",
    ".png": "PNG Image (OCR)",
    ".jpg": "JPEG Image (OCR)",
    ".jpeg": "JPEG Image (OCR)",
    ".tiff": "TIFF Image (OCR)",
    ".bmp": "BMP Image (OCR)",
}

VoxCPM_AVAILABLE = False
KITTEN_TTS_AVAILABLE = False

try:
    import voxcpm
    VoxCPM_AVAILABLE = True
except ImportError:
    pass

try:
    import kittentts
    KITTEN_TTS_AVAILABLE = True
except ImportError:
    pass

DEFAULT_TTS_PROVIDER = "edge_tts"
DEFAULT_STT_PROVIDER = "whisper"
DEFAULT_TTS_LANGUAGE = "en"
DEFAULT_STT_LANGUAGE = "en"
MAX_FILE_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024
