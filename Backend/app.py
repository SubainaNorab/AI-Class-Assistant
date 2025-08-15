# Backend/app.py

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from summarizer import generate_summary
from utils.quiz_generator import build_prompt, call_ai_model,generate_quiz_and_flashcards
from utils.pdf_reader import extract_text_from_pdf
from werkzeug.utils import secure_filename
from datetime import datetime, timezone
from database import quiz_collection, flashcard_collection, db
import os
import math
from bson import ObjectId
import uuid

# Import the quiz blueprint
from routes.quiz_routes import quiz_bp

app = Flask(__name__)
CORS(app)

# Register the quiz blueprint
app.register_blueprint(quiz_bp)

# Create feedback collection
feedback_collection = db["feedback"]

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'pptx', 'txt', 'mp3', 'wav'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_category(filename):
    ext = filename.rsplit('.', 1)[1].lower()
    if ext in ['mp3', 'wav']:
        return 'audio'
    elif ext in ['pdf']:
        return 'pdfs'
    elif ext in ['docx', 'pptx']:
        return 'presentations'
    elif ext in ['txt']:
        return 'documents'
    return 'documents'

# ===== GLOBAL ERROR HANDLER =====
@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        "error": "Bad Request",
        "message": "The request could not be understood by the server",
        "status_code": 400
    }), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Not Found",
        "message": "The requested resource was not found",
        "status_code": 404
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "error": "Internal Server Error",
        "message": "An unexpected error occurred on the server",
        "status_code": 500
    }), 500

@app.errorhandler(Exception)
def handle_exception(e):
    return jsonify({
        "error": "Internal Server Error",
        "message": str(e),
        "status_code": 500
    }), 500

# ===== EXISTING ROUTES =====
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
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        name, ext = os.path.splitext(filename)
        unique_filename = f"{name}_{timestamp}{ext}"
        
        file_path = os.path.join(category_folder, unique_filename)
        file.save(file_path)
        
        return jsonify({
            'message': 'File uploaded successfully',
            'filename': unique_filename,
            'category': category,
            'path': file_path
        }), 200

    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/summarize', methods=['POST'])
def summarize():
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
            
        summary = generate_summary(text)
        
        return jsonify({'summary': summary}), 200
        
    except Exception as e:
        return jsonify({'error': f'Summarization failed: {str(e)}'}), 500

@app.route('/feedback', methods=['POST'])
def submit_feedback():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['type', 'item_id', 'rating']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Validate rating range
        if not 1 <= data['rating'] <= 5:
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        
        # Create feedback document
        feedback_doc = {
            'type': data['type'],
            'item_id': data['item_id'],
            'rating': data['rating'],
            'comment': data.get('comment', ''),
            'created_at': datetime.utcnow()
        }
        
        # Insert into database
        result = feedback_collection.insert_one(feedback_doc)
        
        return jsonify({
            'message': 'Feedback submitted successfully',
            'feedback_id': str(result.inserted_id)
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Failed to submit feedback: {str(e)}'}), 500

# Backend/app.py - Update the progress route
@app.route('/progress', methods=['GET'])
def get_progress():
    try:
        from datetime import timedelta
        
        # Get total counts
        total_quizzes = quiz_collection.count_documents({})
        total_flashcards = flashcard_collection.count_documents({})
        
        # Get recent activity (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        # Quiz performance over time
        quiz_pipeline = [
            {"$match": {"created_at": {"$gte": thirty_days_ago}}},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$created_at"
                        }
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        quiz_activity = list(quiz_collection.aggregate(quiz_pipeline))
        
        # Flashcard activity
        flashcard_pipeline = [
            {"$match": {"created_at": {"$gte": thirty_days_ago}}},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d", 
                            "date": "$created_at"
                        }
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        flashcard_activity = list(flashcard_collection.aggregate(flashcard_pipeline))
        
        # Difficulty breakdown
        difficulty_pipeline = [
            {
                "$group": {
                    "_id": "$difficulty",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        difficulty_breakdown = list(quiz_collection.aggregate(difficulty_pipeline))
        
        # Format performance data for charts
        performance_data = []
        for item in quiz_activity:
            performance_data.append({
                "date": item["_id"],
                "quizzes": item["count"],
                "flashcards": 0  # Initialize
            })
        
        # Add flashcard data
        for item in flashcard_activity:
            found = False
            for perf in performance_data:
                if perf["date"] == item["_id"]:
                    perf["flashcards"] = item["count"]
                    found = True
                    break
            if not found:
                performance_data.append({
                    "date": item["_id"],
                    "quizzes": 0,
                    "flashcards": item["count"]
                })
        
        # Sort by date
        performance_data.sort(key=lambda x: x["date"])
        
        return jsonify({
            "total_quizzes": total_quizzes,
            "total_flashcards": total_flashcards,
            "performance_data": performance_data,
            "difficulty_breakdown": difficulty_breakdown,
            "success": True
        }), 200
        
    except Exception as e:
        return jsonify({
            "error": f"Failed to fetch progress data: {str(e)}",
            "success": False
        }), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get basic statistics"""
    try:
        total_quizzes = quiz_collection.count_documents({})
        total_flashcards = flashcard_collection.count_documents({})
        
        # Get average feedback rating
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
        
        # Get recent feedback
        recent_feedback = list(
            feedback_collection.find({})
            .sort("created_at", -1)
            .limit(5)
        )
        
        # Format recent feedback
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
@app.route('/progress/<quiz_id>', methods=['GET'])
def get_quiz_progress(quiz_id):
    try:
        quiz = quiz_collection.find_one({"_id": ObjectId(quiz_id)})
        if not quiz:
            return jsonify({"error": "Quiz not found"}), 404
        
        # Example: Return completion percentage
        progress_data = {
            "quiz_id": quiz_id,
            "lecture_title": quiz.get("lecture_title", ""),
            "difficulty": quiz.get("difficulty", ""),
            "completed": False  # Placeholder until you track it
        }
        return jsonify(progress_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/')
def index():
    return jsonify({
        "message": "AI Class Assistant Backend - Day 8 Enhanced",
        "status": "running",
        "endpoints": {
            "quiz": "/quiz - Get quizzes with pagination and filtering",
            "generate_quiz": "/generate-quiz - Generate quiz with metadata",
            "flashcards": "/flashcards - Get flashcards",
            "progress": "/progress - Statistics endpoint",
            "upload": "/upload - File upload functionality",
            "summarize": "/summarize - Text summarization",
            "feedback": "/feedback - Feedback submission",
            "stats": "/stats - Basic statistics"
        },
        "new_features": {
            "difficulty_levels": ["Easy", "Medium", "Hard"],
            "topic_tags": "Support for categorizing quizzes",
            "time_tracking": "Track time taken for quizzes"
        }
    })

@app.route('/flashcards', methods=['GET'])
def get_flashcards():
    """Get flashcards with optional filters"""
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        search = request.args.get('search', '').strip()
        lecture_filter = request.args.get('lecture', '').strip()
        
        # Build query
        query = {}
        if search:
            query['question'] = {'$regex': search, '$options': 'i'}
        if lecture_filter:
            query['lecture_title'] = {'$regex': lecture_filter, '$options': 'i'}
        
        # Get total count
        total_count = flashcard_collection.count_documents(query)
        
        # Calculate pagination
        skip = (page - 1) * limit
        total_pages = math.ceil(total_count / limit)
        
        # Fetch flashcards
        flashcards_cursor = flashcard_collection.find(query).skip(skip).limit(limit).sort('created_at', -1)
        
        flashcards = []
        for fc in flashcards_cursor:
            flashcards.append({
                '_id': str(fc.get('_id', '')),
                'lecture_title': fc.get('lecture_title', ''),
                'question': fc.get('question', ''),
                'answer': fc.get('answer', ''),
                'created_at': fc.get('created_at', datetime.now()).isoformat() if fc.get('created_at') else None
            })
        
        return jsonify({
            'flashcards': flashcards,
            'pagination': {
                'page': page,
                'limit': limit,
                'total_pages': total_pages,
                'total_count': total_count
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch flashcards: {str(e)}'}), 500

QUIZZES = []
FLASHCARDS = []

@app.route("/generate-quiz", methods=["POST"])
def generate_quiz_route():
    try:
        data = request.get_json()
        summary = data.get("summary", "")

        if not summary.strip():
            return jsonify({"error": "Summary is required"}), 400

        quiz_questions, flashcards = generate_quiz_and_flashcards(summary)

        quiz_ids = []
        for q in quiz_questions:
            quiz_id = str(uuid.uuid4())
            QUIZZES.append({
                "id": quiz_id,
                "question": q.get("question"),
                "options": q.get("options", []),
                "answer": q.get("answer"),
                "created_at": datetime.utcnow().isoformat()
            })
            quiz_ids.append(quiz_id)

        flashcard_ids = []
        for f in flashcards:
            flashcard_id = str(uuid.uuid4())
            FLASHCARDS.append({
                "id": flashcard_id,
                "question": f.get("question"),
                "answer": f.get("answer"),
                "created_at": datetime.utcnow().isoformat()
            })
            flashcard_ids.append(flashcard_id)

        return jsonify({
            "message": "Quiz and flashcards generated successfully",
            "quiz_count": len(quiz_questions),
            "quiz_ids": quiz_ids,
            "flashcard_count": len(flashcards),
            "flashcard_ids": flashcard_ids
        })

    except Exception as e:
        print(f"Error in generate_quiz: {e}")
        return jsonify({"error": f"Failed to generate quiz: {str(e)}"}), 500

@app.route("/quizzes", methods=["GET"])
def get_quizzes():
    return jsonify(QUIZZES)






if __name__ == "__main__":
    app.run(debug=True)