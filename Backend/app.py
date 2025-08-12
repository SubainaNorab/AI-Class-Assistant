# Backend/app.py

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from summarizer import generate_summary
from utils.quiz_generator import build_prompt, call_ai_model
from utils.pdf_reader import extract_text_from_pdf
from werkzeug.utils import secure_filename
from datetime import datetime, timezone
from routes.quiz_routes import  get_flashcards
from database import quiz_collection, flashcard_collection, db
import os
import math
from bson import ObjectId
from flask import Flask
from routes.quiz_routes import flashcard_bp

app = Flask(__name__)
app.register_blueprint(flashcard_bp)

CORS(app)

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
        return 'audio'  # Will save to uploads/audio/
    elif ext in ['pdf']:
        return 'pdfs'   # Will save to uploads/pdfs/ (matches your structure)
    elif ext in ['docx', 'pptx']:
        return 'presentations'  # Will save to uploads/presentations/
    elif ext in ['txt']:
        return 'documents'      # Will save to uploads/documents/
    return 'documents'  # Default fallback'

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

# ===== EXISTING ROUTES (keeping functionality) =====
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

# ===== NEW DAY 7 ENHANCED ENDPOINTS =====

@app.route('/get-quiz', methods=['GET'])
def get_quizzes():
    """Enhanced Quiz API with pagination, filtering, and search"""
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        search = request.args.get('search', '').strip()
        lecture_filter = request.args.get('lecture', '').strip()
        date_filter = request.args.get('date', '').strip()
        
        # Validate pagination params
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 10
            
        # Build MongoDB query
        query = {}
        
        # Search by keyword (in question text)
        if search:
            query['question'] = {'$regex': search, '$options': 'i'}
            
        # Filter by lecture title
        if lecture_filter:
            query['lecture_title'] = {'$regex': lecture_filter, '$options': 'i'}
            
        # Filter by date (format: YYYY-MM-DD)
        if date_filter:
            try:
                start_date = datetime.strptime(date_filter, '%Y-%m-%d')
                end_date = start_date.replace(hour=23, minute=59, second=59)
                query['created_at'] = {
                    '$gte': start_date,
                    '$lte': end_date
                }
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        
        # Calculate skip for pagination
        skip = (page - 1) * limit
        
        # Get total count for pagination info
        total_count = quiz_collection.count_documents(query)
        total_pages = math.ceil(total_count / limit)
        
        # Fetch quizzes with pagination
        quizzes = list(quiz_collection.find(query)
                      .sort('created_at', -1)
                      .skip(skip)
                      .limit(limit))
        
        # Convert ObjectId to string for JSON serialization
        for quiz in quizzes:
            quiz['_id'] = str(quiz['_id'])
            if isinstance(quiz.get('created_at'), datetime):
                quiz['created_at'] = quiz['created_at'].isoformat()
        
        return jsonify({
            "quizzes": quizzes,
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_count": total_count,
                "limit": limit,
                "has_next": page < total_pages,
                "has_prev": page > 1
            },
            "filters_applied": {
                "search": search,
                "lecture": lecture_filter,
                "date": date_filter
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error fetching quizzes: {str(e)}"}), 500

@app.route('/flashcards', methods=['GET'])
def get_flashcards():
    """Enhanced Flashcards API with pagination, filtering, and search"""
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        search = request.args.get('search', '').strip()
        lecture_filter = request.args.get('lecture', '').strip()
        date_filter = request.args.get('date', '').strip()
        
        # Validate pagination params
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 10
            
        # Build MongoDB query
        query = {}
        
        # Search by keyword (in question or answer text)
        if search:
            query['$or'] = [
                {'question': {'$regex': search, '$options': 'i'}},
                {'answer': {'$regex': search, '$options': 'i'}}
            ]
            
        # Filter by lecture title
        if lecture_filter:
            query['lecture_title'] = {'$regex': lecture_filter, '$options': 'i'}
            
        # Filter by date
        if date_filter:
            try:
                start_date = datetime.strptime(date_filter, '%Y-%m-%d')
                end_date = start_date.replace(hour=23, minute=59, second=59)
                query['created_at'] = {
                    '$gte': start_date,
                    '$lte': end_date
                }
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        
        # Calculate skip for pagination
        skip = (page - 1) * limit
        
        # Get total count for pagination info
        total_count = flashcard_collection.count_documents(query)
        total_pages = math.ceil(total_count / limit)
        
        # Fetch flashcards with pagination
        flashcards = list(flashcard_collection.find(query)
                         .sort('created_at', -1)
                         .skip(skip)
                         .limit(limit))
        
        # Convert ObjectId to string for JSON serialization
        for flashcard in flashcards:
            flashcard['_id'] = str(flashcard['_id'])
            if isinstance(flashcard.get('created_at'), datetime):
                flashcard['created_at'] = flashcard['created_at'].isoformat()
        
        return jsonify({
            "flashcards": flashcards,
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_count": total_count,
                "limit": limit,
                "has_next": page < total_pages,
                "has_prev": page > 1
            },
            "filters_applied": {
                "search": search,
                "lecture": lecture_filter,
                "date": date_filter
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error fetching flashcards: {str(e)}"}), 500

@app.route('/progress', methods=['GET'])
def get_progress():
    """Progress Tracking Endpoint - Returns quiz stats and flashcard review counts"""
    try:
        # Get optional user_id from query params (for future user-specific stats)
        user_id = request.args.get('user_id', 'default')
        
        # Basic statistics
        total_quizzes = quiz_collection.count_documents({})
        total_flashcards = flashcard_collection.count_documents({})
        
        # Quiz performance stats (mock data since we don't have user answers yet)
        # In a real implementation, you'd have a separate collection for user quiz attempts
        quiz_stats = {
            "total_generated": total_quizzes,
            "total_attempted": total_quizzes,  # Mock: assume all generated quizzes were attempted
            "average_score": 0.75,  # Mock: 75% average
            "correct_answers": int(total_quizzes * 3 * 0.75),  # Mock: assuming 3 questions per quiz
            "total_questions": total_quizzes * 3
        }
        
        # Flashcard review stats (mock data)
        flashcard_stats = {
            "total_created": total_flashcards,
            "total_reviewed": int(total_flashcards * 0.8),  # Mock: 80% reviewed
            "mastered": int(total_flashcards * 0.6),  # Mock: 60% mastered
            "needs_review": int(total_flashcards * 0.2)  # Mock: 20% needs review
        }
        
        # Recent activity (last 7 days)
        from datetime import timedelta
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        
        recent_quizzes = quiz_collection.count_documents({
            'created_at': {'$gte': seven_days_ago}
        })
        
        recent_flashcards = flashcard_collection.count_documents({
            'created_at': {'$gte': seven_days_ago}
        })
        
        # Performance over time (mock data for chart)
        performance_data = [
            {"date": "2024-08-05", "score": 0.7, "quizzes": 2},
            {"date": "2024-08-06", "score": 0.8, "quizzes": 3},
            {"date": "2024-08-07", "score": 0.75, "quizzes": 1},
            {"date": "2024-08-08", "score": 0.85, "quizzes": 4},
            {"date": "2024-08-09", "score": 0.9, "quizzes": 2},
            {"date": "2024-08-10", "score": 0.72, "quizzes": 3},
            {"date": "2024-08-11", "score": 0.88, "quizzes": 2}
        ]
        
        # Lecture breakdown
        lecture_pipeline = [
            {
                "$group": {
                    "_id": "$lecture_title",
                    "quiz_count": {"$sum": 1}
                }
            },
            {"$sort": {"quiz_count": -1}},
            {"$limit": 10}
        ]
        
        lecture_breakdown = list(quiz_collection.aggregate(lecture_pipeline))
        
        return jsonify({
            "user_id": user_id,
            "quiz_stats": quiz_stats,
            "flashcard_stats": flashcard_stats,
            "recent_activity": {
                "last_7_days": {
                    "quizzes_generated": recent_quizzes,
                    "flashcards_created": recent_flashcards
                }
            },
            "performance_over_time": performance_data,
            "lecture_breakdown": lecture_breakdown,
            "summary": {
                "quizzes_generated": total_quizzes,
                "flashcards_reviewed": flashcard_stats["total_reviewed"],
                "correct_ratio": quiz_stats["average_score"]
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error fetching progress data: {str(e)}"}), 500
# Add this route to your app.py (in addition to the existing /progress route)

@app.route('/progress/<user_id>', methods=['GET'])
def get_user_progress(user_id):
    """Progress Tracking Endpoint with User ID - For frontend compatibility"""
    try:
        # Get the same data as the regular progress endpoint
        total_quizzes = quiz_collection.count_documents({})
        total_flashcards = flashcard_collection.count_documents({})
        
        # Quiz performance stats (mock data since we don't have user answers yet)
        quiz_stats = {
            "total_generated": total_quizzes,
            "total_attempted": total_quizzes,
            "average_score": 0.75,
            "correct_answers": int(total_quizzes * 3 * 0.75) if total_quizzes > 0 else 0,
            "total_questions": total_quizzes * 3 if total_quizzes > 0 else 0
        }
        
        # Flashcard review stats (mock data)
        flashcard_stats = {
            "total_created": total_flashcards,
            "total_reviewed": int(total_flashcards * 0.8) if total_flashcards > 0 else 0,
            "mastered": int(total_flashcards * 0.6) if total_flashcards > 0 else 0,
            "needs_review": int(total_flashcards * 0.2) if total_flashcards > 0 else 0
        }
        
        # Performance over time (mock data for chart)
        performance_data = [
            {"date": "2024-08-05", "score": 70, "name": "Aug 5"},  # Changed format for frontend
            {"date": "2024-08-06", "score": 80, "name": "Aug 6"},
            {"date": "2024-08-07", "score": 75, "name": "Aug 7"}, 
            {"date": "2024-08-08", "score": 85, "name": "Aug 8"},
            {"date": "2024-08-09", "score": 90, "name": "Aug 9"},
            {"date": "2024-08-10", "score": 72, "name": "Aug 10"},
            {"date": "2024-08-11", "score": 88, "name": "Aug 11"}
        ]
        
        return jsonify({
            "user_id": user_id,
            "quiz_stats": quiz_stats,
            "flashcard_stats": flashcard_stats,
            "performance": performance_data,  # Frontend expects 'performance' key
            "quizzes_generated": total_quizzes,  # Direct fields for frontend
            "flashcards_reviewed": flashcard_stats["total_reviewed"],
            "correct_ratio": quiz_stats["average_score"]
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error fetching progress data: {str(e)}"}), 500

# ===== EXISTING FEEDBACK ROUTES (keeping functionality) =====
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
    """Legacy stats endpoint - keeping for backward compatibility"""
    try:
        # Count total quizzes and flashcards
        total_quizzes = quiz_collection.count_documents({})
        total_flashcards = flashcard_collection.count_documents({})
        
        # Calculate average feedback rating
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

@app.route('/')
def index():
    return jsonify({
        "message": "AI Class Assistant Backend - Day 7 Enhanced",
        "status": "running",
        "endpoints": {
            "quiz": "/quiz - Enhanced with pagination and filtering",
            "flashcards": "/flashcards - Enhanced with pagination and filtering", 
            "progress": "/progress - New statistics endpoint",
            "generate_quiz": "/generate-quiz - Original quiz generation",
            "upload": "/upload - File upload functionality",
            "summarize": "/summarize - Text summarization",
            "feedback": "/feedback - Feedback submission",
            "stats": "/stats - Basic statistics"
        }
    })


# to get quizzes

@app.route("/get-quiz", methods=["GET"])
def get_quiz():
    quizzes = list(quiz_collection.find({}, {"_id": 0}))  # hide MongoDB _id
    return jsonify(quizzes)

if __name__ == '__main__':
    app.run(debug=True, port=5000)