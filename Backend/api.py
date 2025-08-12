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
    difficulty = data.get("difficulty", "Medium")   # ✅ new field with default
    topic_tags = data.get("topic_tags", [])         # ✅ new field with default
    time_taken = data.get("time_taken", 0)          # ✅ new field with default

    if not summary:
        return jsonify({"error": "No summary provided"}), 400

    quiz = generate_quiz(summary)
    flashcards = generate_flashcards(summary)

    if not quiz or not flashcards:
        return jsonify({"error": "Quiz or flashcards generation failed"}), 500

    created_at = datetime.utcnow()

    # ✅ Quiz documents with new fields
    quiz_docs = [
        {
            "lecture_title": "from-summary",
            "question": q["question"],
            "options": q["options"],
            "answer": q["answer"],
            "difficulty": difficulty,
            "topic_tags": topic_tags,
            "time_taken": time_taken,
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

@api.route('/quizzes', methods=['GET'])
def get_quizzes():
    try:
        quizzes = quiz_collection.find({})
        result = []
        for q in quizzes:
            result.append({
                "lecture_title": q.get("lecture_title"),
                "question": q.get("question"),
                "options": q.get("options"),
                "answer": q.get("answer"),
                "difficulty": q.get("difficulty", "Medium"),  # ✅ default if missing
                "topic_tags": q.get("topic_tags", []),         # ✅ default if missing
                "time_taken": q.get("time_taken", 0),          # ✅ default if missing
                "created_at": q.get("created_at")
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"Error fetching quizzes: {str(e)}"}), 500
