from fastapi import APIRouter, UploadFile, File
from datetime import datetime
import fitz  # PyMuPDF

from utils import generate_quiz_and_flashcards
from config.db import quiz_collection  # MongoDB collection

quiz_router = APIRouter()

@quiz_router.post("/generate-quiz")
async def generate_quiz_endpoint(file: UploadFile = File(...)):
    try:
        # Read file content
        content = await file.read()
        text = ""

        # Extract text based on file type
        if file.filename.endswith(".pdf"):
            doc = fitz.open(stream=content, filetype="pdf")
            for page in doc:
                text += page.get_text()
        elif file.filename.endswith(".txt"):
            text = content.decode("utf-8")
        else:
            return {"error": "Unsupported file type. Only .pdf and .txt allowed."}

        # Optional: Trim long input
        text = text.strip()
        if len(text) > 5000:
            text = text[:5000]

        # Generate quiz and flashcards
        result = generate_quiz_and_flashcards(text)

        if not result.get("quiz") and not result.get("flashcards"):
            return {"error": "Quiz or flashcards not generated."}

        # Store in MongoDB
        document = {
            "lecture_title": file.filename,
            "quiz": result["quiz"],
            "flashcards": result["flashcards"],
            "created_at": datetime.utcnow()
        }
        await quiz_collection.insert_one(document)

        return {
            "message": "Quiz and flashcards generated successfully",
            "data": result
        }

    except Exception as e:
        return {"error": "Failed to process file", "details": str(e)}
