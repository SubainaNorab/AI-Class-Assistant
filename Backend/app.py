# Backend/app.py - Merged Complete Version

from flask import Flask, request, jsonify
from flask_cors import CORS
from summarizer import generate_summary
from utils.quiz_generator import generate_quiz_and_flashcards
from utils.pdf_reader import extract_text_from_pdf
from werkzeug.utils import secure_filename
from datetime import datetime, timezone, timedelta
from database import quiz_collection, flashcard_collection, db
import os
import math
from bson import ObjectId
import uuid
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager
from routes.explain_routes import explain_bp

app = Flask(__name__)
CORS(app)
load_dotenv()

# JWT Configuration
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "fallback-secret")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 3600))
jwt = JWTManager(app)

from routes.user_routes import user_bp
app.register_blueprint(user_bp)

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'message': '🎓 AI Class Assistant API',
        'auth_endpoints': {
            'signup': 'POST /users/signup',
            'login': 'POST /users/login', 
            'profile': 'GET /users/me'
        }
    }), 200

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'authentication': 'enabled'}), 200

# Collections for comprehensive tracking
quiz_results_collection = db["quiz_results"]
quiz_sessions_collection = db["quiz_sessions"]
feedback_collection = db["feedback"]
user_profiles_collection = db["user_profiles"]

# Respect existing upload folder structure
UPLOAD_FOLDER = 'uploads'
UPLOAD_SUBFOLDERS = {
    'audio': ['mp3', 'wav', 'aac', 'flac', 'm4a'],
    'documents': ['txt', 'rtf', 'md'],
    'pdfs': ['pdf'],
    'presentations': ['ppt', 'pptx', 'odp']
}

# Create subfolders if they don't exist (preserve existing structure)
for subfolder in UPLOAD_SUBFOLDERS.keys():
    subfolder_path = os.path.join(UPLOAD_FOLDER, subfolder)
    os.makedirs(subfolder_path, exist_ok=True)

def get_upload_subfolder(filename):
    """Determine which subfolder to use based on file extension"""
    if not filename:
        return 'documents'  # Default fallback
    
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    for subfolder, extensions in UPLOAD_SUBFOLDERS.items():
        if ext in extensions:
            return subfolder
    
    # Default fallback for unknown extensions
    return 'documents'

def allowed_file(filename):
    """Check if file type is allowed based on existing structure"""
    if not filename or '.' not in filename:
        return False
    
    ext = filename.rsplit('.', 1)[1].lower()
    all_allowed_extensions = []
    for extensions in UPLOAD_SUBFOLDERS.values():
        all_allowed_extensions.extend(extensions)
    
    return ext in all_allowed_extensions

def get_file_category(filename):
    """Get file category based on existing folder structure"""
    return get_upload_subfolder(filename)

# ===== FILE ROUTES =====

@app.route('/uploads', methods=['GET'])
def get_uploads():
    """Get files from your existing database structure"""
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        print(f"📁 Fetching files for user: {user_id}")
        
        # Access your existing files collection
        files_collection = db["files"]
        
        # For now, get all files (we'll add user filtering when upload system is fixed)
        files_cursor = files_collection.find().sort("createdAt", -1)
        
        uploads = []
        for file_doc in files_cursor:
            file_id = str(file_doc["_id"])
            
            # Handle your current data structure
            upload_item = {
                "_id": file_id,
                "original_name": (
                    file_doc.get("original_name") or 
                    file_doc.get("filename") or 
                    f"Document {file_id[-8:]}"  # Use last 8 chars of ID as readable name
                ),
                "filename": file_doc.get("filename", f"doc_{file_id[-8:]}.txt"),
                "category": file_doc.get("category", "documents"),
                "size": (
                    file_doc.get("size") or 
                    len(str(file_doc.get("content", "")))
                ),
                "uploaded_at": file_doc.get("uploaded_at") or file_doc.get("createdAt"),
                "uploaded_by": file_doc.get("uploaded_by", user_id),
                "status": file_doc.get("status", "uploaded"),
                "content": file_doc.get("content", ""),
                "text": file_doc.get("text", file_doc.get("content", "")),
                "summary": file_doc.get("summary", ""),
                "text_length": len(str(file_doc.get("content", "")))
            }
            uploads.append(upload_item)
        
        print(f"✅ Returning {len(uploads)} files")
        
        return jsonify({
            "success": True,
            "uploads": uploads,
            "count": len(uploads)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in /uploads: {str(e)}")
        return jsonify({"error": str(e), "success": False}), 500

@app.route('/upload', methods=['POST'])
def upload_file():
    """Enhanced upload that stores proper metadata in your database"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        user_id = request.form.get('user_id', 'anonymous')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': f'File type not allowed. Supported: {", ".join(sum(UPLOAD_SUBFOLDERS.values(), []))}'}), 400

        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        
        # Determine file category and subfolder  
        subfolder = get_upload_subfolder(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, subfolder, unique_filename)
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # Save file to disk
        file.save(filepath)
        print(f"📁 File saved to: {filepath}")
        
        category = get_file_category(file.filename)
        
        # Create comprehensive document for your database
        file_doc = {
            # Original metadata
            'original_name': file.filename,  # This is what was missing!
            'filename': unique_filename,
            'category': category,
            'subfolder': subfolder,
            'size': os.path.getsize(filepath),
            'uploaded_by': user_id,  # Important: link to user
            'uploaded_at': datetime.utcnow(),
            'status': 'uploaded',
            'filepath': filepath,
            
            # Timestamps (matching your existing format)
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }
        
        # Process text content for documents/PDFs
        if category in ['documents', 'pdfs']:
            try:
                extracted_text = extract_text_from_pdf(filepath)
                summary = generate_summary(extracted_text)
                
                file_doc.update({
                    'text': extracted_text,
                    'content': extracted_text,  # Your existing field
                    'summary': summary,        # Your existing field
                    'text_length': len(extracted_text),
                    'summary_length': len(summary) if summary else 0
                })
                
                print(f"📝 Processed text content: {len(extracted_text)} chars")
                
            except Exception as e:
                print(f"⚠️ Text processing error: {e}")
                file_doc.update({
                    'text': '',
                    'content': '',
                    'summary': 'Failed to process text content',
                    'text_length': 0,
                    'processing_error': str(e)
                })
        
        # Store in your existing files collection
        files_collection = db["files"]
        result = files_collection.insert_one(file_doc)
        file_id = str(result.inserted_id)
        
        print(f"✅ File stored with ID: {file_id}")
        
        return jsonify({
            'success': True,
            'message': f'File {file.filename} uploaded successfully',
            'file_id': file_id,
            'original_name': file.filename,
            'filename': unique_filename,
            'category': category,
            'size': file_doc['size'],
            'processed': len(file_doc.get('content', '')) > 0
        }), 200
        
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@app.route('/admin/fix-files', methods=['POST'])
def fix_existing_files():
    """One-time fix for existing files in database - adds missing metadata"""
    try:
        files_collection = db["files"]
        
        # Find files missing original_name
        files_to_fix = files_collection.find({"original_name": {"$exists": False}})
        
        fixed_count = 0
        for file_doc in files_to_fix:
            file_id = str(file_doc["_id"])
            
            # Add missing metadata
            update_doc = {
                "original_name": f"Document {file_id[-8:]}",
                "filename": f"doc_{file_id[-8:]}.txt", 
                "category": "documents",
                "size": len(str(file_doc.get("content", ""))),
                "uploaded_by": "system",  # Default user
                "uploaded_at": file_doc.get("createdAt"),
                "status": "uploaded",
                "filepath": f"documents/doc_{file_id[-8:]}.txt"
            }
            
            files_collection.update_one(
                {"_id": file_doc["_id"]},
                {"$set": update_doc}
            )
            
            fixed_count += 1
        
        return jsonify({
            "success": True,
            "message": f"Fixed {fixed_count} files",
            "fixed_count": fixed_count
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/debug/files', methods=['GET'])
def debug_files():
    """Debug route to see what's in your files collection"""
    try:
        files_collection = db["files"]
        
        # Get all files (limit to 10 for safety)
        all_files = list(files_collection.find().limit(10))
        
        # Convert ObjectIds to strings
        for file_doc in all_files:
            file_doc["_id"] = str(file_doc["_id"])
            if "uploaded_by" in file_doc and isinstance(file_doc["uploaded_by"], ObjectId):
                file_doc["uploaded_by"] = str(file_doc["uploaded_by"])
        
        return jsonify({
            "success": True,
            "files": all_files,
            "count": len(all_files),
            "collections": db.list_collection_names()
        }), 200
        
    except Exception as e:
        print(f"❌ Debug error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ===== QUIZ GENERATION =====
@app.route('/generate-quiz', methods=['POST'])
def generate_quiz_route():
    """Generate quiz with comprehensive metadata"""
    try:
        data = request.get_json()
        
        # Extract data with defaults
        summary = data.get('summary', '').strip()
        lecture_title = data.get('lecture_title', 'Generated Quiz').strip()
        difficulty = data.get('difficulty', 'Medium')
        topic_tags = data.get('topic_tags', [])
        user_id = data.get('user_id', 'anonymous')
        
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
        
        print(f"🎯 Generating quiz: {lecture_title} | Difficulty: {difficulty} | User: {user_id}")
        
        # Generate quiz and flashcards
        quiz_questions, flashcards = generate_quiz_and_flashcards(summary)
        
        if not quiz_questions:
            return jsonify({'error': 'Failed to generate quiz questions'}), 500
            
        created_at = datetime.utcnow()
        quiz_id = str(ObjectId())
        
        # Prepare quiz documents
        quiz_docs = []
        for i, q in enumerate(quiz_questions):
            question = q.get('question', '').strip()
            options = q.get('options', [])
            answer = q.get('answer', '').strip()
            
            if not question or not options or not answer:
                continue
                
            if not isinstance(options, list) or len(options) == 0:
                continue
                
            quiz_doc = {
                '_id': ObjectId(),
                'quiz_id': quiz_id,
                'lecture_title': lecture_title,
                'question': question,
                'options': options,
                'answer': answer,
                'difficulty': difficulty,
                'topic_tags': topic_tags,
                'question_number': i + 1,
                'total_questions': len([q for q in quiz_questions if q.get('question')]),
                'created_at': created_at,
                'created_by': user_id,
                'source_summary': summary[:200] + '...' if len(summary) > 200 else summary
            }
            quiz_docs.append(quiz_doc)
        
        # Prepare flashcard documents
        flashcard_docs = []
        if flashcards:
            for fc in flashcards:
                flashcard_doc = {
                    '_id': ObjectId(),
                    'quiz_id': quiz_id,
                    'lecture_title': lecture_title,
                    'question': fc.get('question', ''),
                    'answer': fc.get('answer', ''),
                    'created_at': created_at,
                    'created_by': user_id
                }
                flashcard_docs.append(flashcard_doc)
        
        # Insert into database
        if quiz_docs:
            quiz_collection.insert_many(quiz_docs)
            print(f"💾 Saved {len(quiz_docs)} questions for lecture: {lecture_title}")
            
        if flashcard_docs:
            flashcard_collection.insert_many(flashcard_docs)
            print(f"💾 Saved {len(flashcard_docs)} flashcards")
        
        return jsonify({
            'message': 'Quiz and flashcards generated successfully',
            'quiz_id': quiz_id,
            'lecture_title': lecture_title,
            'question_count': len(quiz_docs),
            'flashcard_count': len(flashcard_docs),
            'difficulty': difficulty,
            'topic_tags': topic_tags
        }), 201
        
    except Exception as e:
        print(f"❌ Error in generate_quiz: {str(e)}")
        return jsonify({'error': f'Failed to generate quiz: {str(e)}'}), 500

# ===== GET LECTURES (Fixed score display + Enhanced features) =====
@app.route('/lectures', methods=['GET'])
def get_lectures():
    """Get all lectures with comprehensive progress and metadata"""
    try:
        print("📚 Fetching lectures with enhanced data...")
        
        # Get query parameters for filtering
        search = request.args.get('search', '').strip()
        difficulty_filter = request.args.get('difficulty', '').strip()
        tag_filter = request.args.get('tag', '').strip()
        user_id = request.args.get('user_id', 'anonymous')
        
        # Build query
        query = {
            'question': {'$ne': None, '$exists': True, '$ne': ''},
            'options': {'$ne': None, '$exists': True, '$not': {'$size': 0}},
            'answer': {'$ne': None, '$exists': True, '$ne': ''}
        }
        
        # Add filters
        if difficulty_filter and difficulty_filter != 'all':
            query['difficulty'] = difficulty_filter
            
        if tag_filter:
            query['topic_tags'] = {'$in': [tag_filter]}
            
        if search:
            query['$or'] = [
                {'question': {'$regex': search, '$options': 'i'}},
                {'lecture_title': {'$regex': search, '$options': 'i'}}
            ]
        
        # Get all matching quizzes
        quizzes = list(quiz_collection.find(query).sort('created_at', -1))
        print(f"📊 Found {len(quizzes)} total quiz questions")
        
        # Group by quiz_id and lecture_title
        lectures = {}
        
        for quiz in quizzes:
            quiz_id = quiz.get('quiz_id', str(quiz['_id']))
            lecture_title = quiz.get('lecture_title', 'Untitled Quiz')
            
            if quiz_id not in lectures:
                lectures[quiz_id] = {
                    'quiz_id': quiz_id,
                    'lecture_title': lecture_title,
                    'questions': [],
                    'total_questions': quiz.get('total_questions', 1),
                    'difficulty': quiz.get('difficulty', 'Medium'),
                    'topic_tags': quiz.get('topic_tags', []),
                    'created_at': quiz.get('created_at'),
                    'created_by': quiz.get('created_by', 'anonymous'),
                    'source_summary': quiz.get('source_summary', ''),
                    'progress': {
                        'completed': 0,
                        'total': quiz.get('total_questions', 1),
                        'percentage': 0,
                        'is_completed': False,
                        'current_question': 1,
                        'final_score': None,
                        'last_attempt': None
                    },
                    'stats': {
                        'attempts': 0,
                        'best_score': 0,
                        'average_score': 0,
                        'total_time': 0
                    }
                }
            
            # Add question to lecture
            lectures[quiz_id]['questions'].append({
                'question_id': str(quiz['_id']),
                'question': quiz['question'],
                'options': quiz['options'],
                'answer': quiz['answer'],
                'question_number': quiz.get('question_number', len(lectures[quiz_id]['questions']) + 1)
            })
        
        # Get progress and stats for each lecture - FIXED SCORE DISPLAY
        for quiz_id, lecture_data in lectures.items():
            # Get current session
            session = quiz_sessions_collection.find_one({'quiz_id': quiz_id})
            if session:
                lecture_data['progress'] = {
                    'completed': session.get('questions_completed', 0),
                    'total': session.get('total_questions', lecture_data['total_questions']),
                    'percentage': int((session.get('questions_completed', 0) / session.get('total_questions', 1)) * 100),
                    'is_completed': session.get('is_completed', False),
                    'current_question': session.get('current_question', 1),
                    'final_score': session.get('final_score'),  # FIXED: This now properly retrieves the score
                    'last_attempt': session.get('completed_at', session.get('last_updated'))
                }
            
            # Get all-time stats
            all_sessions = list(quiz_sessions_collection.find({
                'quiz_id': quiz_id,
                'is_completed': True
            }))
            
            if all_sessions:
                scores = [s.get('final_score', 0) for s in all_sessions if s.get('final_score') is not None]
                times = [s.get('total_time', 0) for s in all_sessions if s.get('total_time') is not None]
                
                lecture_data['stats'] = {
                    'attempts': len(all_sessions),
                    'best_score': max(scores) if scores else 0,
                    'average_score': sum(scores) / len(scores) if scores else 0,
                    'total_time': sum(times) if times else 0
                }
            
            # Update total_questions based on actual questions
            actual_question_count = len(lecture_data['questions'])
            lecture_data['total_questions'] = actual_question_count
            lecture_data['progress']['total'] = actual_question_count
            
            # Sort questions by question_number
            lecture_data['questions'].sort(key=lambda x: x.get('question_number', 0))
            
            # Format dates for JSON
            if lecture_data['created_at']:
                lecture_data['created_at'] = lecture_data['created_at'].isoformat()
            if lecture_data['progress']['last_attempt']:
                lecture_data['progress']['last_attempt'] = lecture_data['progress']['last_attempt'].isoformat()
        
        # Convert to list and sort
        lecture_list = list(lectures.values())
        lecture_list.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        print(f"📚 Returning {len(lecture_list)} lectures with enhanced data")
        
        return jsonify({
            'lectures': lecture_list,
            'total_lectures': len(lecture_list),
            'available_tags': get_available_tags(),
            'available_difficulties': ['Easy', 'Medium', 'Hard']
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching lectures: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to fetch lectures: {str(e)}'}), 500

def get_available_tags():
    """Get all unique tags from quizzes"""
    try:
        pipeline = [
            {'$unwind': '$topic_tags'},
            {'$group': {'_id': '$topic_tags'}},
            {'$sort': {'_id': 1}}
        ]
        tags = [doc['_id'] for doc in quiz_collection.aggregate(pipeline)]
        return tags
    except:
        return []

# ===== QUIZ ROUTES (Enhanced with proper score tracking) =====
@app.route('/quiz/<quiz_id>', methods=['GET'])
def get_quiz(quiz_id):
    """Get quiz for taking with enhanced session management"""
    try:
        print(f"🎯 Getting quiz: {quiz_id}")
        
        # Get questions for this quiz
        questions = list(quiz_collection.find({
            'quiz_id': quiz_id
        }).sort('question_number', 1))
        
        if not questions:
            # Try fallback for old structure
            try:
                question = quiz_collection.find_one({'_id': ObjectId(quiz_id)})
                if question:
                    questions = [question]
            except:
                pass
        
        if not questions:
            return jsonify({'error': 'Quiz not found'}), 404
        
        # Get or create quiz session
        session = quiz_sessions_collection.find_one({'quiz_id': quiz_id})
        if not session:
            session = {
                'quiz_id': quiz_id,
                'lecture_title': questions[0]['lecture_title'],
                'total_questions': len(questions),
                'current_question': 1,
                'questions_completed': 0,
                'is_completed': False,
                'started_at': datetime.utcnow(),
                'answers': [],
                'user_id': 'anonymous'
            }
            quiz_sessions_collection.insert_one(session)
            print(f"📝 Created new quiz session for {quiz_id}")
        
        # Format questions for frontend
        formatted_questions = []
        for i, q in enumerate(questions):
            formatted_questions.append({
                'question_id': str(q['_id']),
                'question': q['question'],
                'options': q['options'],
                'answer': q['answer'],
                'question_number': q.get('question_number', i + 1)
            })
        
        quiz_data = {
            'quiz_id': quiz_id,
            'lecture_title': questions[0]['lecture_title'],
            'difficulty': questions[0].get('difficulty', 'Medium'),
            'topic_tags': questions[0].get('topic_tags', []),
            'questions': formatted_questions,
            'total_questions': len(formatted_questions),
            'session': {
                'current_question': session['current_question'],
                'questions_completed': session['questions_completed'],
                'is_completed': session['is_completed'],
                'started_at': session['started_at'].isoformat() if session.get('started_at') else None
            },
            'metadata': {
                'created_by': questions[0].get('created_by', 'anonymous'),
                'source_summary': questions[0].get('source_summary', ''),
                'created_at': questions[0].get('created_at', '').isoformat() if questions[0].get('created_at') else None
            }
        }
        
        print(f"✅ Returning quiz with {len(formatted_questions)} questions")
        return jsonify(quiz_data), 200
        
    except Exception as e:
        print(f"❌ Error getting quiz: {str(e)}")
        return jsonify({'error': f'Failed to get quiz: {str(e)}'}), 500

@app.route('/quiz/<quiz_id>/answer', methods=['POST'])
def submit_answer(quiz_id):
    """Submit answer with enhanced tracking and FIXED score calculation"""
    try:
        data = request.get_json()
        
        question_id = data.get('question_id')
        selected_answer = data.get('selected_answer')
        correct_answer = data.get('correct_answer')
        time_taken = data.get('time_taken', 0)
        question_number = data.get('question_number', 1)
        user_id = data.get('user_id', 'anonymous')
        
        if not question_id or not selected_answer:
            return jsonify({'error': 'Question ID and selected answer required'}), 400
        
        is_correct = selected_answer == correct_answer
        
        # Save detailed answer result
        answer_result = {
            'quiz_id': quiz_id,
            'question_id': question_id,
            'question_number': question_number,
            'selected_answer': selected_answer,
            'correct_answer': correct_answer,
            'is_correct': is_correct,
            'time_taken': time_taken,
            'answered_at': datetime.utcnow(),
            'user_id': user_id,
            'session_id': f"{quiz_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        }
        
        quiz_results_collection.insert_one(answer_result)
        print(f"💾 Saved answer for Q{question_number}: {'✅' if is_correct else '❌'} ({time_taken}s)")
        
        # Update quiz session with PROPER score calculation
        session = quiz_sessions_collection.find_one({'quiz_id': quiz_id})
        if session:
            new_completed = session['questions_completed'] + 1
            new_current = session['current_question'] + 1
            total_questions = session['total_questions']
            
            # Add answer to session
            session_answers = session.get('answers', [])
            session_answers.append({
                'question_number': question_number,
                'question_id': question_id,
                'selected_answer': selected_answer,
                'correct_answer': correct_answer,
                'is_correct': is_correct,
                'time_taken': time_taken,
                'answered_at': datetime.utcnow()
            })
            
            # Check if quiz is completed
            is_completed = new_completed >= total_questions
            
            # Update session
            update_data = {
                'questions_completed': new_completed,
                'current_question': min(new_current, total_questions),
                'answers': session_answers,
                'last_updated': datetime.utcnow(),
                'user_id': user_id
            }
            
            if is_completed:
                update_data['is_completed'] = True
                update_data['completed_at'] = datetime.utcnow()
                
                # FIXED: Proper final score calculation
                correct_count = sum(1 for ans in session_answers if ans['is_correct'])
                final_score = round((correct_count / total_questions) * 100, 1)
                total_time = sum(ans['time_taken'] for ans in session_answers)
                average_time = round(total_time / total_questions, 1)
                
                update_data.update({
                    'final_score': final_score,  # FIXED: This will now save correctly
                    'total_time': total_time,
                    'average_time_per_question': average_time,
                    'correct_answers': correct_count,
                    'incorrect_answers': total_questions - correct_count,
                    'accuracy_percentage': final_score
                })
                
                print(f"🎉 Quiz completed! Score: {final_score}% ({correct_count}/{total_questions})")
            
            quiz_sessions_collection.update_one(
                {'quiz_id': quiz_id},
                {'$set': update_data}
            )
            
            response_data = {
                'is_correct': is_correct,
                'question_completed': question_number,
                'questions_remaining': max(0, total_questions - new_completed),
                'quiz_completed': is_completed,
                'next_question': new_current if not is_completed else None,
                'progress_percentage': round((new_completed / total_questions) * 100, 1)
            }
            
            if is_completed:
                response_data.update({
                    'final_score': update_data['final_score'],
                    'total_time': update_data['total_time'],
                    'correct_answers': update_data['correct_answers'],
                    'accuracy_percentage': update_data['accuracy_percentage']
                })
            
            return jsonify(response_data), 200
        
        return jsonify({'error': 'Session not found'}), 404
        
    except Exception as e:
        print(f"❌ Error submitting answer: {str(e)}")
        return jsonify({'error': f'Failed to submit answer: {str(e)}'}), 500

# ===== FEEDBACK SYSTEM =====
@app.route('/feedback', methods=['POST'])
def submit_feedback():
    """Submit feedback for quiz or specific question"""
    try:
        data = request.get_json()
        
        feedback_type = data.get('type')  # 'quiz', 'question', 'general'
        item_id = data.get('item_id')  # quiz_id or question_id
        rating = data.get('rating')  # 1-5 stars
        comment = data.get('comment', '')
        user_id = data.get('user_id', 'anonymous')
        category = data.get('category', 'general')  # 'difficulty', 'content', 'interface', etc.
        
        # Validate required fields
        if not all([feedback_type, item_id, rating]):
            return jsonify({'error': 'Type, item_id, and rating are required'}), 400
        
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        
        # Create feedback document
        feedback_doc = {
            'type': feedback_type,
            'item_id': item_id,
            'rating': rating,
            'comment': comment,
            'category': category,
            'user_id': user_id,
            'submitted_at': datetime.utcnow(),
            'helpful_votes': 0,
            'status': 'pending'
        }
        
        result = feedback_collection.insert_one(feedback_doc)
        
        print(f"📝 Feedback submitted: {feedback_type} | {rating}⭐ | {item_id}")
        
        return jsonify({
            'message': 'Feedback submitted successfully',
            'feedback_id': str(result.inserted_id)
        }), 201
        
    except Exception as e:
        print(f"❌ Error submitting feedback: {str(e)}")
        return jsonify({'error': f'Failed to submit feedback: {str(e)}'}), 500

@app.route('/feedback/<item_id>', methods=['GET'])
def get_feedback(item_id):
    """Get feedback for a specific item"""
    try:
        feedback_type = request.args.get('type', 'quiz')
        
        # Get all feedback for this item
        feedback_list = list(feedback_collection.find({
            'item_id': item_id,
            'type': feedback_type
        }).sort('submitted_at', -1))
        
        # Format feedback for response
        formatted_feedback = []
        for fb in feedback_list:
            formatted_feedback.append({
                'feedback_id': str(fb['_id']),
                'rating': fb['rating'],
                'comment': fb['comment'],
                'category': fb.get('category', 'general'),
                'user_id': fb.get('user_id', 'anonymous'),
                'submitted_at': fb['submitted_at'].isoformat(),
                'helpful_votes': fb.get('helpful_votes', 0)
            })
        
        # Calculate statistics
        ratings = [fb['rating'] for fb in feedback_list]
        stats = {
            'total_feedback': len(feedback_list),
            'average_rating': round(sum(ratings) / len(ratings), 1) if ratings else 0,
            'rating_distribution': {
                '5': ratings.count(5),
                '4': ratings.count(4),
                '3': ratings.count(3),
                '2': ratings.count(2),
                '1': ratings.count(1)
            }
        }
        
        return jsonify({
            'feedback': formatted_feedback,
            'statistics': stats
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting feedback: {str(e)}")
        return jsonify({'error': f'Failed to get feedback: {str(e)}'}), 500

# ===== PROGRESS STATISTICS =====
@app.route('/progress', methods=['GET'])
def get_progress():
    """Get comprehensive progress statistics"""
    try:
        user_id = request.args.get('user_id', 'anonymous')
        print(f"📊 Generating progress for user: {user_id}")
        
        # Basic counts
        total_quizzes = len(set(quiz_collection.distinct('quiz_id')))
        completed_sessions = quiz_sessions_collection.count_documents({
            'is_completed': True,
            'user_id': user_id
        })
        
        # Get recent activity (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        daily_activity = []
        for i in range(30):
            day = thirty_days_ago + timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            # Count activity for this day
            sessions_count = quiz_sessions_collection.count_documents({
                'completed_at': {'$gte': day_start, '$lte': day_end},
                'is_completed': True,
                'user_id': user_id
            })
            
            questions_answered = quiz_results_collection.count_documents({
                'answered_at': {'$gte': day_start, '$lte': day_end},
                'user_id': user_id
            })
            
            daily_activity.append({
                'date': day.strftime('%Y-%m-%d'),
                'quizzes_completed': sessions_count,
                'questions_answered': questions_answered,
                'study_time': 0
            })
        
        # Difficulty breakdown
        difficulty_breakdown = []
        try:
            pipeline = [
                {'$group': {'_id': '$difficulty', 'count': {'$sum': 1}}},
                {'$sort': {'count': -1}}
            ]
            difficulty_breakdown = list(quiz_collection.aggregate(pipeline))
        except Exception as e:
            print(f"Warning: Could not generate difficulty breakdown: {e}")
        
        # Recent sessions
        recent_sessions = list(quiz_sessions_collection.find({
            'is_completed': True,
            'user_id': user_id
        }).sort('completed_at', -1).limit(5))
        
        recent_sessions_formatted = []
        for session in recent_sessions:
            recent_sessions_formatted.append({
                'lecture_title': session.get('lecture_title', 'Unknown'),
                'score': session.get('final_score', 0),
                'completed_at': session.get('completed_at', '').isoformat() if session.get('completed_at') else '',
                'questions_completed': session.get('questions_completed', 0),
                'total_time': session.get('total_time', 0)
            })
        
        # Overall stats
        total_answers = quiz_results_collection.count_documents({'user_id': user_id})
        correct_answers = quiz_results_collection.count_documents({
            'is_correct': True,
            'user_id': user_id
        })
        accuracy = (correct_answers / total_answers * 100) if total_answers > 0 else 0
        
        # Calculate averages
        if recent_sessions:
            avg_score = sum(s.get('final_score', 0) for s in recent_sessions) / len(recent_sessions)
            avg_time = sum(s.get('total_time', 0) for s in recent_sessions) / len(recent_sessions)
        else:
            avg_score = 0
            avg_time = 0
        
        stats = {
            'total_quizzes': total_quizzes,
            'completed_quizzes': completed_sessions,
            'completion_percentage': int((completed_sessions / total_quizzes * 100)) if total_quizzes > 0 else 0,
            'accuracy_percentage': int(accuracy),
            'average_score': int(avg_score),
            'average_time': int(avg_time),
            'total_questions_answered': total_answers,
            'performance_data': daily_activity,
            'difficulty_breakdown': difficulty_breakdown,
            'recent_sessions': recent_sessions_formatted
        }
        
        print(f"📈 Generated comprehensive stats for {user_id}")
        return jsonify(stats), 200
        
    except Exception as e:
        print(f"❌ Error generating progress: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate progress: {str(e)}'}), 500

# ===== TEXT SUMMARIZATION =====
@app.route('/summarize', methods=['POST'])
def summarize_text():
    """Enhanced text summarization with tracking"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        user_id = data.get('user_id', 'anonymous')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        summary = generate_summary(text)
        
        return jsonify({
            'summary': summary,
            'original_length': len(text),
            'summary_length': len(summary),
            'compression_ratio': round(len(summary) / len(text) * 100, 1)
        })
    except Exception as e:
        return jsonify({'error': f'Summarization failed: {str(e)}'}), 500
    
@app.route('/summary/<file_id>', methods=['GET'])
def get_summary(file_id):
    """Fetch summary + content for a given file"""
    try:
        files_collection = db["files"]

        # Build query safely
        if ObjectId.is_valid(file_id):
            query = {"$or": [{"filename": file_id}, {"_id": ObjectId(file_id)}]}
        else:
            query = {"filename": file_id}

        file_doc = files_collection.find_one(query)

        if not file_doc:
            return jsonify({"success": False, "error": "File not found"}), 404

        return jsonify({
            "success": True,
            "file_id": str(file_doc["_id"]),
            "original_name": file_doc.get("original_name", "Untitled Document"),
            "filename": file_doc.get("filename"),
            "summary": file_doc.get("summary", "No summary available"),
            "content": file_doc.get("content", "")
        }), 200

    except Exception as e:
        print(f"❌ Error in /summary/{file_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500



# Register explainer blueprint
app.register_blueprint(explain_bp)

if __name__ == "__main__":
    print("🚀 Starting Enhanced Quiz API Server...")
    print("📁 Respecting existing folder structure:")
    for subfolder, extensions in UPLOAD_SUBFOLDERS.items():
        print(f"   📂 {subfolder}/: {', '.join(extensions)}")
    print("📊 Available endpoints:")
    print("  POST /generate-quiz - Generate quiz with metadata")
    print("  GET  /lectures - Get lectures with FIXED score display")
    print("  GET  /quiz/<id> - Get quiz for taking")
    print("  POST /quiz/<id>/answer - Submit answer with proper scoring")
    print("  GET  /progress - Comprehensive statistics")
    print("  POST /feedback - Submit feedback")
    print("  GET  /feedback/<id> - Get feedback")
    print("  POST /upload - Enhanced file upload (respects existing structure)")
    print("  GET  /uploads - List uploaded files")
    print("  POST /admin/fix-files - Fix existing files metadata")
    print("  GET  /debug/files - Debug file structure")
    print("  POST /summarize - Text summarization")
    app.run(debug=True, host='0.0.0.0', port=5000)