import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_MODEL = "openai/gpt-oss-120b"
import platform

if platform.system() == "Windows":
    TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    POPPLER_PATH = r"D:\Release-26.09.0-0\poppler-26.09.0\Library\bin"
else:
    # Linux (Docker/hosting) — installed via apt, already on PATH
    TESSERACT_PATH = "tesseract"
    POPPLER_PATH = None