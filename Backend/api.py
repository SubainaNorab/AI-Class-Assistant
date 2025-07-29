# backend/api.py
from flask import Blueprint, request, jsonify
from datetime import datetime
from utils.quiz_generator import generate_quiz
from utils.flashcard_generator import generate_flashcards
from .database import quiz_collection, flashcard_collection

api = Blueprint('api', __name__)

@api.route('/generate-quiz', methods=['POST'])
def generate_quiz():
    data = request.get_json()
    summary = data.get("summary")
    
    if not summary:
        return jsonify({"error": "No summary provided"}), 400

    quiz = generate_quiz(summary)
    flashcards = generate_flashcards(summary)

    if not quiz or not flashcards:
        return jsonify({"error": "Quiz or flashcards generation failed"}), 500

    created_at = datetime.utcnow()

    quiz_docs = [
        {
            "lecture_title": "from-summary",
            "question": q["question"],
            "options": q["options"],
            "answer": q["answer"],
            "created_at": created_at
        }
        for q in quiz
    ]

    flashcard_docs = [
        {
            "lecture_title": "from-summary",
            "question": fc["question"],
            "answer": fc["answer"],
            "created_at": created_at
        }
        for fc in flashcards
    ]

    quiz_collection.insert_many(quiz_docs)
    flashcard_collection.insert_many(flashcard_docs)

    return jsonify({
        "message": "Quiz and flashcards saved to database.",
        "quiz_count": len(quiz_docs),
        "flashcard_count": len(flashcard_docs)
    })
