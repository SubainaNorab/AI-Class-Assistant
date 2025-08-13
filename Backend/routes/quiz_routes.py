from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from utils.quiz_generator import build_prompt, call_ai_model
from database import quiz_collection, flashcard_collection
from datetime import datetime
from flask import Blueprint, request, jsonify
from database import flashcard_collection
from werkzeug.exceptions import BadRequest

router = APIRouter()

class SummaryInput(BaseModel):
    lecture_title: str
    summary: str
    difficulty: str = "Medium"  
    topic_tags: list = []       
    time_taken: int = 0         

@router.post("/generate-quiz-from-summary/")
async def generate_quiz_from_summary(data: SummaryInput):
    try:
        # ✅ Backend validation
        allowed_difficulties = ["Easy", "Medium", "Hard"]
        if data.difficulty not in allowed_difficulties:
            raise HTTPException(status_code=400, detail="Invalid difficulty. Allowed values: Easy, Medium, Hard.")

        if not isinstance(data.topic_tags, list) or not all(isinstance(tag, str) for tag in data.topic_tags):
            raise HTTPException(status_code=400, detail="topic_tags must be a list of strings.")

        if not isinstance(data.time_taken, (int, float)) or data.time_taken < 0:
            raise HTTPException(status_code=400, detail="time_taken must be a positive number.")

        # Build prompt & call AI model
        prompt = build_prompt(data.summary)
        result = call_ai_model(prompt)

        if not result or ("quiz" not in result and "flashcards" not in result):
            raise HTTPException(status_code=400, detail="Invalid AI result")

        created_at = datetime.utcnow()

        # ✅ Quiz documents with metadata
        quiz_docs = [
            {
                "lecture_title": data.lecture_title,
                "question": q["question"],
                "options": q["options"],
                "answer": q["answer"],
                "difficulty": data.difficulty,      
                "topic_tags": data.topic_tags,      
                "time_taken": data.time_taken,       
                "created_at": created_at
            }
            for q in result.get("quiz", [])
        ]

        # ✅ Flashcards remain the same
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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating quiz: {str(e)}")

@router.get("/quizzes/")
async def get_quizzes():
    try:
        quizzes = quiz_collection.find()
        result = []
        for q in quizzes:
            result.append({
                "lecture_title": q.get("lecture_title"),
                "question": q.get("question"),
                "options": q.get("options"),
                "answer": q.get("answer"),
                "difficulty": q.get("difficulty", "Medium"),  # default if missing
                "topic_tags": q.get("topic_tags", []),         # default if missing
                "time_taken": q.get("time_taken", 0),          # default if missing
                "created_at": q.get("created_at")
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching quizzes: {str(e)}")

from flask import Blueprint, jsonify
from database import flashcard_collection

flashcard_bp = Blueprint('flashcard_bp', __name__)

@flashcard_bp.route("/get-flashcards", methods=["GET"])
def get_flashcards():
    flashcards = list(flashcard_collection.find({}, {"_id": 0}))
    return jsonify(flashcards)

@flashcard_bp.route("/flashcards/", methods=["POST"])
def create_flashcard():
    try:
        data = request.get_json()

        # Validate fields
        if not data.get("lecture_title") or not data.get("question") or not data.get("answer"):
            return jsonify({"error": "lecture_title, question, and answer are required"}), 400

        flashcard_doc = {
            "lecture_title": data["lecture_title"],
            "question": data["question"],
            "answer": data["answer"],
            "difficulty": data.get("difficulty", "Medium"),
            "topic_tags": data.get("topic_tags", []),
            "time_taken": data.get("time_taken", 0),
            "created_at": datetime.utcnow()
        }
        result = flashcard_collection.insert_one(flashcard_doc)
        print("Inserted ID:", result.inserted_id)
        print("DB Name:", flashcard_collection.database.name)
        print("Collection Name:", flashcard_collection.name)

        # flashcard_collection.insert_one(flashcard_doc)
        return jsonify({"message": "Flashcard created successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
