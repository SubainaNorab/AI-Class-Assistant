# Backend/app.py

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from summarizer import generate_summary
from utils.quiz_generator import generate_quiz_and_flashcards
from utils.pdf_reader import extract_text_from_pdf
from werkzeug.utils import secure_filename
from datetime import datetime, timezone
from database import quiz_collection, flashcard_collection, db
import os
import math
from bson import ObjectId
import uuid

app = Flask(__name__)
CORS(app)

# Create collections
feedback_collection = db["feedback"]
quiz_results_collection = db["quiz_results"]

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

# ===== ROUTE: Test endpoint =====
@app.route('/', methods=['GET'])
def health_check():
    """Test endpoint to verify server is running"""
    return jsonify({
        'message': 'Quiz Generation API is running!',
        'status': 'healthy',
        'endpoints': [
            'POST /generate-quiz - Generate new quiz',
            'GET /quizzes - Get all quizzes',
            'POST /quiz-results - Save quiz results',
            'GET /progress - Get progress stats',
            'POST /upload - Upload files',
            'POST /summarize - Summarize text'
        ]
    })

# ===== ROUTE: Generate Quiz =====
@app.route('/generate-quiz', methods=['POST'])
def generate_quiz_route():
    """Main route for quiz generation"""
    try:
        print("🎯 Generate quiz route called")
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Extract data with defaults
        summary = data.get('summary', '').strip()
        lecture_title = data.get('lecture_title', 'Generated Quiz').strip()
        difficulty = data.get('difficulty', 'Medium')
        topic_tags = data.get('topic_tags', [])
        
        print(f"📝 Request data: summary={summary[:50]}..., lecture={lecture_title}, difficulty={difficulty}")
        
        # Validate required fields
        if not summary:
            return jsonify({'error': 'Summary is required'}), 400
            
        if not lecture_title:
            lecture_title = 'Generated Quiz'
            
        # Validate difficulty
        allowed_difficulties = ['Easy', 'Medium', 'Hard']
        if difficulty not in allowed_difficulties:
            difficulty = 'Medium'
            
        # Ensure topic_tags is a list
        if not isinstance(topic_tags, list):
            if isinstance(topic_tags, str):
                topic_tags = [tag.strip() for tag in topic_tags.split(',') if tag.strip()]
            else:
                topic_tags = []
        
        print(f"🎯 Generating quiz: {lecture_title} | Difficulty: {difficulty} | Tags: {topic_tags}")
        
        # Generate quiz and flashcards using the utility function
        quiz_questions, flashcards = generate_quiz_and_flashcards(summary)
        
        if not quiz_questions:
            return jsonify({'error': 'Failed to generate quiz questions'}), 500
            
        created_at = datetime.utcnow()
        
        # Prepare quiz documents with metadata
        quiz_docs = []
        for i, q in enumerate(quiz_questions):
            # Validate quiz data before saving
            question = q.get('question', '').strip()
            options = q.get('options', [])
            answer = q.get('answer', '').strip()
            
            if not question or not options or not answer:
                print(f"⚠️ Skipping invalid quiz question {i+1}: question='{question}', options={options}, answer='{answer}'")
                continue
                
            if not isinstance(options, list) or len(options) == 0:
                print(f"⚠️ Skipping quiz with invalid options: {options}")
                continue
                
            quiz_doc = {
                'lecture_title': lecture_title,
                'question': question,
                'options': options,
                'answer': answer,
                'difficulty': difficulty,
                'topic_tags': topic_tags,
                'created_at': created_at,
                'is_completed': False,
                'completion_time': None
            }
            quiz_docs.append(quiz_doc)
            print(f"✅ Valid quiz doc {len(quiz_docs)}: {question[:50]}...") 
        
        # Prepare flashcard documents
        flashcard_docs = []
        if flashcards:
            for fc in flashcards:
                flashcard_doc = {
                    'lecture_title': lecture_title,
                    'question': fc.get('question', ''),
                    'answer': fc.get('answer', ''),
                    'created_at': created_at
                }
                flashcard_docs.append(flashcard_doc)
        
        # Insert into database
        quiz_ids = []
        flashcard_ids = []
        
        if quiz_docs:
            result = quiz_collection.insert_many(quiz_docs)
            quiz_ids = [str(id) for id in result.inserted_ids]
            print(f"💾 Saved {len(quiz_docs)} quiz questions to database")
            
        if flashcard_docs:
            result = flashcard_collection.insert_many(flashcard_docs)
            flashcard_ids = [str(id) for id in result.inserted_ids]
            print(f"💾 Saved {len(flashcard_docs)} flashcards to database")
        
        return jsonify({
            'message': 'Quiz and flashcards generated successfully',
            'quiz_count': len(quiz_docs),
            'flashcard_count': len(flashcard_docs),
            'quiz_ids': quiz_ids,
            'flashcard_ids': flashcard_ids,
            'lecture_title': lecture_title
        }), 201
        
    except Exception as e:
        print(f"❌ Error in generate_quiz: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate quiz: {str(e)}'}), 500

# ===== ROUTE: Get Quizzes =====
@app.route('/quizzes', methods=['GET'])
def get_quizzes():
    """Get all quizzes grouped by lecture for frontend display"""
    try:
        print("📚 Get quizzes route called")
        
        # Get query parameters for filtering
        search = request.args.get('search', '').strip()
        difficulty_filter = request.args.get('difficulty', '').strip()
        lecture_filter = request.args.get('lecture', '').strip()
        
        print(f"🔍 Filters: search='{search}', difficulty='{difficulty_filter}', lecture='{lecture_filter}'")
        
        # Build query - EXCLUDE invalid questions
        query = {
            'question': {'$ne': None, '$exists': True, '$ne': ''},
            'options': {'$ne': None, '$exists': True, '$not': {'$size': 0}},
            'answer': {'$ne': None, '$exists': True, '$ne': ''}
        }
        
        # Add filters
        if search:
            query['question'] = {
                '$regex': search, 
                '$options': 'i',
                '$ne': None,
                '$exists': True,
                '$ne': ''
            }
            
        if difficulty_filter and difficulty_filter != 'all':
            query['difficulty'] = difficulty_filter
            
        if lecture_filter:
            query['lecture_title'] = {'$regex': lecture_filter, '$options': 'i'}
        
        print(f"🔍 MongoDB query: {query}")
        
        # Fetch quizzes from database
        quizzes_cursor = quiz_collection.find(query).sort('created_at', -1)
        quizzes = list(quizzes_cursor)
        
        print(f"📊 Found {len(quizzes)} quizzes in database")
        
        # Group quizzes by lecture title for frontend
        grouped_quizzes = {}
        
        for quiz in quizzes:
            lecture_title = quiz.get('lecture_title', 'Untitled Quiz')
            
            # Convert ObjectId to string for JSON serialization
            quiz['_id'] = str(quiz['_id'])
            
            # Format created_at for frontend
            if quiz.get('created_at'):
                quiz['created_at'] = quiz['created_at'].isoformat()
            
            # Initialize lecture group if not exists
            if lecture_title not in grouped_quizzes:
                grouped_quizzes[lecture_title] = {
                    'lecture_title': lecture_title,
                    'questions': [],
                    'total_questions': 0,
                    'difficulty': quiz.get('difficulty', 'Medium'),
                    'topic_tags': quiz.get('topic_tags', []),
                    'created_at': quiz.get('created_at'),
                    'progress': {
                        'completed': 0,
                        'total': 0,
                        'percentage': 0
                    }
                }
            
            # Add quiz to group
            grouped_quizzes[lecture_title]['questions'].append({
                '_id': quiz['_id'],
                'question': quiz['question'],
                'options': quiz['options'],
                'answer': quiz['answer'],
                'difficulty': quiz.get('difficulty', 'Medium'),
                'is_completed': quiz.get('is_completed', False),
                'completion_time': quiz.get('completion_time')
            })
            
            grouped_quizzes[lecture_title]['total_questions'] += 1
            
            # Update progress
            if quiz.get('is_completed'):
                grouped_quizzes[lecture_title]['progress']['completed'] += 1
        
        # Calculate progress percentages
        for lecture_data in grouped_quizzes.values():
            total = lecture_data['progress']['total'] = lecture_data['total_questions']
            completed = lecture_data['progress']['completed']
            lecture_data['progress']['percentage'] = int((completed / total * 100)) if total > 0 else 0
        
        print(f"📚 Returning {len(grouped_quizzes)} lecture groups with {len(quizzes)} total questions")
        
        return jsonify({
            'quizzes': grouped_quizzes,
            'total_lectures': len(grouped_quizzes),
            'total_questions': len(quizzes)
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching quizzes: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to fetch quizzes: {str(e)}'}), 500

# ===== ROUTE: Save Quiz Results =====
@app.route('/quiz-results', methods=['POST'])
def save_quiz_result():
    """Save quiz completion result for progress tracking"""
    try:
        print("💾 Save quiz result route called")
        data = request.get_json()
        
        quiz_id = data.get('quiz_id')
        is_correct = data.get('is_correct', False)
        time_taken = data.get('time_taken', 0)
        selected_answer = data.get('selected_answer', '')
        correct_answer = data.get('correct_answer', '')
        
        print(f"📊 Quiz result: id={quiz_id}, correct={is_correct}, time={time_taken}s")
        
        if not quiz_id:
            return jsonify({'error': 'Quiz ID is required'}), 400
        
        # Save result to quiz_results collection
        result_doc = {
            'quiz_id': quiz_id,
            'is_correct': is_correct,
            'time_taken': time_taken,
            'selected_answer': selected_answer,
            'correct_answer': correct_answer,
            'completed_at': datetime.utcnow()
        }
        
        quiz_results_collection.insert_one(result_doc)
        
        # Update the quiz document to mark as completed
        try:
            quiz_collection.update_one(
                {'_id': ObjectId(quiz_id)},
                {
                    '$set': {
                        'is_completed': True,
                        'completion_time': time_taken,
                        'last_completed': datetime.utcnow()
                    }
                }
            )
            print(f"✅ Updated quiz {quiz_id} completion status")
        except Exception as e:
            print(f"⚠️ Could not update quiz completion: {e}")
        
        print(f"💾 Saved quiz result: {quiz_id} | Correct: {is_correct} | Time: {time_taken}s")
        
        return jsonify({
            'message': 'Quiz result saved successfully',
            'result_id': str(result_doc.get('_id'))
        }), 201
        
    except Exception as e:
        print(f"❌ Error saving quiz result: {str(e)}")
        return jsonify({'error': f'Failed to save quiz result: {str(e)}'}), 500

# ===== ROUTE: Progress Statistics =====
@app.route('/progress', methods=['GET'])
def get_progress_stats():
    """Get user's quiz progress statistics"""
    try:
        print("📈 Get progress stats route called")
        
        # Get total quizzes
        total_quizzes = quiz_collection.count_documents({
            'question': {'$ne': None, '$exists': True, '$ne': ''}
        })
        
        # Get completed quizzes
        completed_quizzes = quiz_collection.count_documents({
            'is_completed': True
        })
        
        # Get recent results
        recent_results = list(quiz_results_collection.find({}).sort('completed_at', -1).limit(10))
        
        # Calculate accuracy
        correct_answers = quiz_results_collection.count_documents({'is_correct': True})
        total_attempts = quiz_results_collection.count_documents({})
        accuracy = (correct_answers / total_attempts * 100) if total_attempts > 0 else 0
        
        # Get average time
        pipeline = [
            {'$group': {'_id': None, 'avg_time': {'$avg': '$time_taken'}}}
        ]
        avg_time_result = list(quiz_results_collection.aggregate(pipeline))
        avg_time = avg_time_result[0]['avg_time'] if avg_time_result else 0
        
        stats = {
            'total_quizzes': total_quizzes,
            'completed_quizzes': completed_quizzes,
            'completion_percentage': int((completed_quizzes / total_quizzes * 100)) if total_quizzes > 0 else 0,
            'accuracy_percentage': int(accuracy),
            'average_time_seconds': int(avg_time),
            'total_attempts': total_attempts,
            'recent_results': [
                {
                    'quiz_id': str(result['quiz_id']),
                    'is_correct': result['is_correct'],
                    'time_taken': result['time_taken'],
                    'completed_at': result['completed_at'].isoformat()
                }
                for result in recent_results
            ]
        }
        
        print(f"📈 Progress stats: {stats}")
        
        return jsonify(stats), 200
        
    except Exception as e:
        print(f"❌ Error fetching progress stats: {str(e)}")
        return jsonify({'error': f'Failed to fetch progress: {str(e)}'}), 500

# ===== ROUTE: Get Flashcards =====
@app.route('/flashcards', methods=['GET'])
def get_flashcards():
    """Get flashcards with pagination and filters"""
    try:
        print("🃏 Get flashcards route called")
        
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        search = request.args.get('search', '').strip()
        lecture_filter = request.args.get('lecture', '').strip()
        
        # Validate pagination
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 20
            
        # Build query
        query = {}
        
        if search:
            query['$or'] = [
                {'question': {'$regex': search, '$options': 'i'}},
                {'answer': {'$regex': search, '$options': 'i'}}
            ]
            
        if lecture_filter:
            query['lecture_title'] = {'$regex': lecture_filter, '$options': 'i'}
        
        # Get total count
        total_count = flashcard_collection.count_documents(query)
        total_pages = math.ceil(total_count / limit)
        
        # Get paginated results
        skip = (page - 1) * limit
        flashcards_cursor = flashcard_collection.find(query).skip(skip).limit(limit).sort('created_at', -1)
        flashcards = list(flashcards_cursor)
        
        # Format for frontend
        formatted_flashcards = []
        for fc in flashcards:
            formatted_flashcards.append({
                '_id': str(fc['_id']),
                'lecture_title': fc.get('lecture_title', ''),
                'question': fc.get('question', ''),
                'answer': fc.get('answer', ''),
                'created_at': fc.get('created_at', datetime.now()).isoformat() if fc.get('created_at') else None
            })
        
        return jsonify({
            'flashcards': formatted_flashcards,
            'pagination': {
                'page': page,
                'limit': limit,
                'total_pages': total_pages,
                'total_count': total_count
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching flashcards: {str(e)}")
        return jsonify({'error': f'Failed to fetch flashcards: {str(e)}'}), 500

# ===== ROUTE: Upload File =====
@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload and processing"""
    try:
        print("📁 Upload file route called")
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"
        
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        category = get_file_category(filename)
        
        print(f"📁 File uploaded: {filename}, category: {category}")
        
        if category in ['pdfs', 'documents']:
            try:
                extracted_text = extract_text_from_pdf(filepath)
                summary = generate_summary(extracted_text)
                
                return jsonify({
                    'message': 'File uploaded and processed successfully',
                    'filename': filename,
                    'category': category,
                    'summary': summary,
                    'text_length': len(extracted_text)
                })
            except Exception as e:
                print(f"⚠️ File processing error: {e}")
                return jsonify({
                    'message': 'File uploaded but processing failed',
                    'filename': filename,
                    'category': category,
                    'error': str(e)
                })
        else:
            return jsonify({
                'message': 'File uploaded successfully',
                'filename': filename,
                'category': category
            })
            
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

# ===== ROUTE: Summarize Text =====
@app.route('/summarize', methods=['POST'])
def summarize_text():
    """Generate summary from text"""
    try:
        print("📝 Summarize text route called")
        
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        summary = generate_summary(text)
        
        return jsonify({
            'summary': summary,
            'original_length': len(text),
            'summary_length': len(summary)
        })
    except Exception as e:
        print(f"❌ Summarization error: {str(e)}")
        return jsonify({'error': f'Summarization failed: {str(e)}'}), 500

# ===== ERROR HANDLERS =====
@app.errorhandler(404)
def not_found(error):
    available_routes = [
        'GET / - Health check',
        'POST /generate-quiz - Generate new quiz',
        'GET /quizzes - Get all quizzes',
        'POST /quiz-results - Save quiz results',
        'GET /progress - Get progress stats',
        'GET /flashcards - Get flashcards',
        'POST /upload - Upload files',
        'POST /summarize - Summarize text'
    ]
    
    return jsonify({
        "error": "Not Found",
        "message": f"The requested endpoint '{request.path}' was not found",
        "available_routes": available_routes,
        "status_code": 404
    }), 404

@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        "error": "Bad Request",
        "message": "The request could not be understood by the server",
        "status_code": 400
    }), 400

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "error": "Internal Server Error",
        "message": "An unexpected error occurred on the server",
        "status_code": 500
    }), 500

if __name__ == "__main__":
    print("🚀 Starting Quiz Generation API Server...")
    print("📊 Available endpoints:")
    print("  GET  / - Health check")
    print("  POST /generate-quiz - Generate new quiz from summary")
    print("  GET  /quizzes - Get all quizzes grouped by lecture")
    print("  POST /quiz-results - Save quiz completion results")
    print("  GET  /progress - Get progress statistics")
    print("  GET  /flashcards - Get flashcards with pagination")
    print("  POST /upload - Upload and process files")
    print("  POST /summarize - Generate text summary")
    print("🌐 Server starting on http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)