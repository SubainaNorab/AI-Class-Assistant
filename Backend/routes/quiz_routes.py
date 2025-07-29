from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from utils.quiz_generator import build_prompt, call_ai_model
from database import quiz_collection, flashcard_collection
from datetime import datetime

router = APIRouter()

class SummaryInput(BaseModel):
    lecture_title: str
    summary: str

@router.post("/generate-quiz-from-summary/")
async def generate_quiz_from_summary(data: SummaryInput):
    try:
        prompt = build_prompt(data.summary)
        result = call_ai_model(prompt)

        if not result or ("quiz" not in result and "flashcards" not in result):
            raise HTTPException(status_code=400, detail="Invalid AI result")

        created_at = datetime.utcnow()

        # Quiz
        quiz_docs = [
            {
                "lecture_title": data.lecture_title,
                "question": q["question"],
                "options": q["options"],
                "answer": q["answer"],
                "created_at": created_at
            }
            for q in result.get("quiz", [])
        ]

        # Flashcards
        flashcard_docs = [
            {
                "lecture_title": data.lecture_title,
                "question": fc["question"],
                "answer": fc["answer"],
                "created_at": created_at
            }
            for fc in result.get("flashcards", [])
        ]

        if quiz_docs:
            quiz_collection.insert_many(quiz_docs)
        if flashcard_docs:
            flashcard_collection.insert_many(flashcard_docs)

        return {
            "message": "Quiz and flashcards generated from summary and saved.",
            "quiz_count": len(quiz_docs),
            "flashcard_count": len(flashcard_docs)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating quiz: {str(e)}")
