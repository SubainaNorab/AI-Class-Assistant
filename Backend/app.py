# Backend/app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from summarizer import generate_summary
from utils.quiz_generator import build_prompt, call_ai_model
from utils.pdf_reader import extract_text_from_pdf
from werkzeug.utils import secure_filename
from datetime import datetime, timezone
from database import quiz_collection, flashcard_collection, db
import os

app = Flask(__name__)
CORS(app)

# Create feedback collection
feedback_collection = db["feedback"]

UPLOAD_FOLDER = 'uploaded_files'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'pptx', 'txt', 'mp3', 'wav'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_category(filename):
    ext = filename.rsplit('.', 1)[1].lower()
    if ext in ['mp3', 'wav']:
        return 'audio'
    elif ext in ['pdf', 'docx', 'pptx', 'txt']:
        return 'document'
    return 'other'

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        category = get_file_category(filename)
        category_folder = os.path.join(UPLOAD_FOLDER, category)
        os.makedirs(category_folder, exist_ok=True)
        filepath = os.path.join(category_folder, filename)
        file.save(filepath)

        return jsonify({'message': 'File uploaded successfully', 'file_path': filepath}), 200

    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/summarize', methods=['POST'])
def summarize_text():
    data = request.get_json()
    text = data.get("text", "")
    summary = generate_summary(text)
    return jsonify({"summary": summary})

@app.route('/generate-quiz', methods=['POST'])
def generate_quiz():
    data = request.get_json()
    summary_text = data.get("summary", "").strip()
    lecture_title = data.get("lecture_title", "Untitled")

    if not summary_text:
        return jsonify({"error": "Summary text is required"}), 400

    if len(summary_text) > 5000:
        summary_text = summary_text[:5000]

    try:
        prompt = build_prompt(summary_text)
        ai_response = call_ai_model(prompt)

        # Validate that ai_response is a string before JSON parsing
        if isinstance(ai_response, str):
            import json, re

            # Extract JSON object from messy output (Raw LLM output)
            match = re.search(r"\{[\s\S]*\}", ai_response)
            if match:
                parsed_output = json.loads(match.group())
            else:
                return jsonify({"error": "No valid JSON found in LLM output"}), 500
        elif isinstance(ai_response, dict):
            parsed_output = ai_response
        else:
            return jsonify({"error": "Unexpected AI response format"}), 500

        quiz = parsed_output.get("quiz", [])
        flashcards = parsed_output.get("flashcards", [])

        if not quiz or not flashcards:
            return jsonify({"error": "Quiz or flashcards generation failed"}), 500

        # Save to MongoDB
        created_at = datetime.now(timezone.utc)

        quiz_docs = [{
            "lecture_title": lecture_title,
            "question": q.get("question"),
            "options": q.get("options"),
            "answer": q.get("answer"),
            "created_at": created_at
        } for q in quiz]

        flashcard_docs = [{
            "lecture_title": lecture_title,
            "question": fc.get("question"),
            "answer": fc.get("answer"),
            "created_at": created_at
        } for fc in flashcards]

        quiz_collection.insert_many(quiz_docs)
        flashcard_collection.insert_many(flashcard_docs)

        return jsonify({
            "message": "Quiz and flashcards generated successfully",
            "quiz_count": len(quiz_docs),
            "flashcard_count": len(flashcard_docs),
            "quiz": quiz,
            "flashcards": flashcards
        }), 200

    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

# Feedback Routes
@app.route('/feedback', methods=['POST'])
def submit_feedback():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['type', 'item_id', 'rating']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        rating = data.get('rating')
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify({"error": "Rating must be an integer between 1 and 5"}), 400
        
        feedback_doc = {
            "type": data.get('type'),
            "item_id": data.get('item_id'),
            "rating": rating,
            "comment": data.get('comment', ''),
            "created_at": datetime.now(timezone.utc)
        }
        
        result = feedback_collection.insert_one(feedback_doc)
        
        return jsonify({
            "message": "Feedback submitted successfully",
            "feedback_id": str(result.inserted_id)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error submitting feedback: {str(e)}"}), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    try:
        # Count total quizzes and flashcards
        total_quizzes = quiz_collection.count_documents({})
        total_flashcards = flashcard_collection.count_documents({})
        
        # Calculate average rating
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "avg_rating": {"$avg": "$rating"},
                    "total_feedback": {"$sum": 1}
                }
            }
        ]
        
        rating_result = list(feedback_collection.aggregate(pipeline))
        avg_rating = rating_result[0]["avg_rating"] if rating_result else 0
        
        # Get 5 most recent feedback entries
        recent_feedback = list(
            feedback_collection.find({})
            .sort("created_at", -1)
            .limit(5)
        )
        
        # Format recent feedback for response
        formatted_feedback = []
        for fb in recent_feedback:
            formatted_feedback.append({
                "type": fb["type"],
                "rating": fb["rating"],
                "comment": fb.get("comment", ""),
                "created_at": fb["created_at"].isoformat()
            })
        
        return jsonify({
            "total_quizzes": total_quizzes,
            "total_flashcards": total_flashcards,
            "avg_rating": round(avg_rating, 1) if avg_rating else 0,
            "recent_feedback": formatted_feedback
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error fetching stats: {str(e)}"}), 500

@app.route('/')
def index():
    return 'AI Class Assistant Backend is running.'

if __name__ == '__main__':
    app.run(debug=True)