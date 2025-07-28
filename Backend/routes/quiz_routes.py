from fastapi import APIRouter, UploadFile, File
from utils import generate_quiz_and_flashcards
from config.db import quiz_collection  # you created this DB connection
from datetime import datetime
import fitz  # PyMuPDF

quiz_router = APIRouter()

@quiz_router.post("/generate-quiz")
async def generate_quiz_endpoint(file: UploadFile = File(...)):
    try:
        # Extract text from PDF or plain file
        content = await file.read()
        text = ""
        if file.filename.endswith(".pdf"):
            doc = fitz.open(stream=content, filetype="pdf")
            for page in doc:
                text += page.get_text()
        else:
            text = content.decode("utf-8")

        # Call utils function from Person A
        result = generate_quiz_and_flashcards(text)

        if not result.get("quiz") and not result.get("flashcards"):
            return {"error": "Quiz or flashcards not generated"}

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
        return {"error": str(e)}
