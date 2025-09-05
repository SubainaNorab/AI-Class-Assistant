# Backend/app.py - Merged Complete Version

from flask import Flask, request, jsonify
from flask_cors import CORS
# Update your import line
from summarizer import (
    generate_summary, 
    generate_detailed_summary, 
    generate_structured_summary,
    generate_long_structured_summary,  # Add this
    generate_extended_summary,         # Add this
    generate_multi_level_summary       # Add this
)
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

# Backend/app.py - COMPLETE FIXED /uploads endpoint

@app.route('/uploads', methods=['GET'])
def get_uploads():
    """Get files from your existing database structure with enhanced summary data"""
    try:
        user_id = request.args.get('user_id')
        include_structured = request.args.get('structured', 'false').lower() == 'true'
        
        print(f"📡 /uploads called with user_id: {user_id}")
        print(f"📡 Request headers: {dict(request.headers)}")
        print(f"📡 Request args: {dict(request.args)}")
        
        if not user_id:
            print("❌ Missing user_id parameter")
            return jsonify({
                'success': False,
                'error': 'user_id parameter is required',
                'received_params': dict(request.args)
            }), 400
        
        print(f"📁 Fetching files for user: {user_id}")
        
        # Access your existing files collection
        files_collection = db["files"]
        
        # Get all files for now (add user filtering later)
        try:
            files_cursor = files_collection.find().sort("createdAt", -1)
            total_count = files_collection.count_documents({})
            print(f"📊 Total files in database: {total_count}")
        except Exception as db_error:
            print(f"❌ Database query error: {db_error}")
            return jsonify({
                'success': False,
                'error': f'Database error: {str(db_error)}'
            }), 500
        
        uploads = []
        processed_count = 0
        
        for file_doc in files_cursor:
            try:
                processed_count += 1
                file_id = str(file_doc["_id"])
                
                # Handle date formatting safely
                upload_date = file_doc.get("upload_date") or file_doc.get("createdAt") or file_doc.get("uploaded_at")
                if upload_date and hasattr(upload_date, 'isoformat'):
                    upload_date = upload_date.isoformat()
                elif not upload_date:
                    upload_date = "2025-01-01T00:00:00.000Z"
                
                # Handle last_summarized date
                last_summarized = file_doc.get("last_summarized")
                if last_summarized and hasattr(last_summarized, 'isoformat'):
                    last_summarized = last_summarized.isoformat()
                else:
                    last_summarized = None
                
                # Create consistent file object with enhanced summary data
                upload_item = {
                    "_id": file_id,
                    "id": file_id,
                    "original_name": (
                        file_doc.get("original_name") or 
                        file_doc.get("filename") or 
                        f"Document {file_id[-8:]}"
                    ),
                    "filename": file_doc.get("filename", f"doc_{file_id[-8:]}.txt"),
                    "category": file_doc.get("category", "documents"),
                    "size": file_doc.get("size") or len(str(file_doc.get("content", ""))),
                    "upload_date": upload_date,
                    "user_id": file_doc.get("user_id") or file_doc.get("uploaded_by", user_id),
                    "status": file_doc.get("status", "uploaded"),
                    "content": file_doc.get("content", ""),
                    "text": file_doc.get("text", file_doc.get("content", "")),
                    "summary": file_doc.get("summary", ""),
                    
                    # Enhanced summary metadata
                    "summary_type": file_doc.get("summary_type", "unknown"),
                    "summary_length": file_doc.get("summary_length", len(file_doc.get("summary", ""))),
                    "text_length": file_doc.get("text_length", len(str(file_doc.get("content", "")))),
                    "compression_ratio": file_doc.get("compression_ratio", 0),
                    "last_summarized": last_summarized,
                    "processing_error": file_doc.get("processing_error"),
                    
                    # File processing status
                    "has_summary": bool(file_doc.get("summary", "").strip()),
                    "has_content": bool(file_doc.get("content", "").strip()),
                    "is_processed": bool(file_doc.get("summary", "").strip() and file_doc.get("content", "").strip()),
                    
                    # Additional metadata
                    "subfolder": file_doc.get("subfolder", "documents"),
                    "filepath": file_doc.get("filepath", "")
                }
                
                # Include structured summary if requested and available
                if include_structured and file_doc.get("structured_summary"):
                    upload_item["structured_summary"] = file_doc["structured_summary"]
                    upload_item["has_structured_summary"] = True
                else:
                    upload_item["has_structured_summary"] = bool(file_doc.get("structured_summary"))
                
                uploads.append(upload_item)
                
            except Exception as item_error:
                print(f"⚠️ Error processing file {file_doc.get('_id', 'unknown')}: {item_error}")
                continue
        
        print(f"✅ Successfully processed {len(uploads)} out of {processed_count} files")
        
        # Calculate summary statistics
        total_files = len(uploads)
        processed_files = len([f for f in uploads if f['is_processed']])
        files_with_summaries = len([f for f in uploads if f['has_summary']])
        files_with_structured = len([f for f in uploads if f['has_structured_summary']])
        
        # Calculate average compression ratio for processed files
        compression_ratios = [f['compression_ratio'] for f in uploads if f['compression_ratio'] > 0]
        avg_compression = sum(compression_ratios) / len(compression_ratios) if compression_ratios else 0
        
        # Return enhanced response format
        response_data = {
            'success': True,
            'files': uploads,
            'uploads': uploads,  # Include both for compatibility
            'total': total_files,
            'user_id': user_id,
            'message': f'Found {total_files} files',
            
            # Enhanced statistics
            'statistics': {
                'total_files': total_files,
                'processed_files': processed_files,
                'files_with_summaries': files_with_summaries,
                'files_with_structured_summaries': files_with_structured,
                'processing_rate': round((processed_files / total_files * 100), 1) if total_files > 0 else 0,
                'average_compression_ratio': round(avg_compression, 1),
                'summary_types': {
                    'brief': len([f for f in uploads if f.get('summary_type') == 'brief']),
                    'detailed': len([f for f in uploads if f.get('summary_type') == 'detailed']),
                    'comprehensive': len([f for f in uploads if f.get('summary_type') == 'comprehensive']),
                    'structured': len([f for f in uploads if f.get('summary_type') == 'structured']),
                    'unknown': len([f for f in uploads if f.get('summary_type') == 'unknown'])
                }
            },
            
            # Filtering and sorting options
            'filters': {
                'categories': list(set([f['category'] for f in uploads])),
                'summary_types': list(set([f.get('summary_type', 'unknown') for f in uploads])),
                'processing_status': ['all', 'processed', 'unprocessed', 'with_summaries', 'with_structured']
            }
        }
        
        print(f"📤 Returning response with {len(uploads)} files and enhanced metadata")
        print(f"📊 Processing stats: {processed_files}/{total_files} processed, {files_with_summaries} with summaries")
        
        return jsonify(response_data), 200

    except Exception as e:
        print(f"❌ Critical error in /uploads endpoint: {e}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'endpoint': '/uploads'
        }), 500

# ALSO ADD: Debug endpoint to help troubleshoot
@app.route('/debug/uploads', methods=['GET'])
def debug_uploads():
    """Debug endpoint to check uploads functionality"""
    try:
        user_id = request.args.get('user_id', 'test_user')
        
        files_collection = db["files"]
        total_files = files_collection.count_documents({})
        
        # Get first few files as samples
        sample_files = list(files_collection.find().limit(3))
        
        debug_info = {
            'database_connected': True,
            'total_files_in_db': total_files,
            'sample_files': [
                {
                    '_id': str(f.get('_id', 'missing')),
                    'has_content': bool(f.get('content')),
                    'has_filename': bool(f.get('filename')),
                    'has_original_name': bool(f.get('original_name')),
                    'keys': list(f.keys())
                } for f in sample_files
            ],
            'user_id_provided': user_id,
            'request_method': request.method,
            'request_headers': dict(request.headers),
            'collections_available': db.list_collection_names()
        }
        
        return jsonify(debug_info), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'database_connected': False
        }), 500

@app.route('/upload', methods=['POST'])
def upload_file():
    """Enhanced upload with support for both 'file' and 'files' keys"""
    try:
        print("=" * 50)
        print("📤 UPLOAD ENDPOINT CALLED")
        print("=" * 50)
        
        # Debug request details
        print(f"📦 Request method: {request.method}")
        print(f"📦 Content-Type: {request.content_type}")
        print(f"📦 Form data keys: {list(request.form.keys())}")
        print(f"📦 Files keys: {list(request.files.keys())}")
        
        # Check for file in both 'file' and 'files' keys
        file = None
        file_key = None
        
        if 'file' in request.files and request.files['file'].filename != '':
            file = request.files['file']
            file_key = 'file'
            print("✅ Found file with key 'file'")
        elif 'files' in request.files and request.files['files'].filename != '':
            file = request.files['files']
            file_key = 'files'
            print("✅ Found file with key 'files'")
        
        user_id = request.form.get('user_id', 'anonymous')
        
        if not file or file.filename == '':
            error_msg = 'No valid file provided'
            print(f"❌ {error_msg}")
            print(f"❌ Available files: {list(request.files.keys())}")
            for key in request.files.keys():
                f = request.files[key]
                print(f"❌ File[{key}]: '{f.filename}' (size: {getattr(f, 'content_length', 0)})")
            
            return jsonify({
                'success': False,
                'error': error_msg,
                'received_files': list(request.files.keys()),
                'file_details': {key: {'filename': request.files[key].filename, 
                                     'size': getattr(request.files[key], 'content_length', 0)} 
                               for key in request.files.keys()}
            }), 400
        
        print(f"✅ File received via key '{file_key}': {file.filename}")
        print(f"✅ User ID: {user_id}")
        print(f"✅ File size: {getattr(file, 'content_length', 'unknown')} bytes")
        
        # Secure filename and create unique name
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        unique_filename = f"{timestamp}_{filename}"
        
        # Determine file category and subfolder  
        subfolder = get_upload_subfolder(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, subfolder, unique_filename)
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # Save file to disk
        file.save(filepath)
        print(f"💾 File saved to: {filepath}")
        
        # Verify file was actually saved
        if not os.path.exists(filepath):
            error_msg = f'File failed to save to disk: {filepath}'
            print(f"❌ {error_msg}")
            return jsonify({'success': False, 'error': error_msg}), 500
        
        actual_size = os.path.getsize(filepath)
        print(f"✅ File saved successfully. Actual size: {actual_size} bytes")
        
        category = get_file_category(file.filename)
        
        # Create comprehensive document for your database
        file_doc = {
            'original_name': file.filename,
            'filename': unique_filename,
            'category': category,
            'subfolder': subfolder,
            'size': actual_size,
            'uploaded_by': user_id,
            'uploaded_at': datetime.utcnow(),
            'status': 'uploaded',
            'filepath': filepath,
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow(),
            'received_via_key': file_key  # Track which key was used
        }
        
        # Process text content for documents/PDFs
        # In your upload_file() function, update the text processing section:
        if category in ['documents', 'pdfs']:
            try:
                if category == 'pdfs':
                    extracted_text = extract_text_from_pdf(filepath)
                else:
                    # For text files, read directly
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        extracted_text = f.read()
                
                # Generate both standard and structured summaries
                summary = generate_detailed_summary(extracted_text)
                structured_summary = generate_long_structured_summary(extracted_text, "detailed")
                
                file_doc.update({
                    'text': extracted_text,
                    'content': extracted_text,
                    'summary': summary,
                    'structured_summary': structured_summary,  # Add structured summary
                    'text_length': len(extracted_text),
                    'summary_length': len(summary) if summary else 0,
                    'compression_ratio': round(len(summary) / len(extracted_text) * 100, 2) if extracted_text and len(extracted_text) > 0 else 0,
                    'summary_type': 'detailed',
                    'last_summarized': datetime.utcnow(),
                    'has_structured_summary': True  # Flag indicating structured summary exists
                })
                
                print(f"📝 Processed text content: {len(extracted_text)} chars, summary: {len(summary)} chars")
                
            except Exception as e:
                print(f"⚠️ Text processing error: {e}")
                file_doc.update({
                    'text': '',
                    'content': '',
                    'summary': 'Failed to process text content',
                    'structured_summary': None,
                    'text_length': 0,
                    'processing_error': str(e),
                    'has_structured_summary': False
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
            'size': actual_size,
            'processed': len(file_doc.get('content', '')) > 0,
            'has_summary': bool(file_doc.get('summary', '').strip()),
            'received_via_key': file_key
        }), 200
        
    except Exception as e:
        error_msg = f'Upload failed: {str(e)}'
        print(f"❌ {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': error_msg}), 500
    
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
    """Enhanced text summarization with structured and multi-level options"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        user_id = data.get('user_id', 'anonymous')
        summary_type = data.get('type', 'detailed')  # brief, detailed, comprehensive, extended
        output_format = data.get('format', 'text')   # text, structured, multi-level
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        if len(text.strip()) < 50:
            return jsonify({'error': 'Text too short to summarize (minimum 50 characters)'}), 400
        
        # Generate appropriate summary based on format
        if output_format == 'structured':
            # Use the new structured summary function
            structured_result = generate_long_structured_summary(text, summary_type)
            return jsonify({
                'success': True,
                'result': structured_result,
                'original_length': len(text),
                'summary_type': 'structured',
                'format': output_format
            })
            
        elif output_format == 'multi-level':
            # Generate summaries at all levels
            multi_level_result = generate_multi_level_summary(text)
            return jsonify({
                'success': True,
                'result': multi_level_result,
                'original_length': len(text),
                'summary_type': 'multi-level',
                'format': output_format
            })
            
        elif summary_type == 'extended':
            # Generate extra-long summary
            target_length = data.get('target_length', 1000)
            summary = generate_extended_summary(text, target_length)
            return jsonify({
                'success': True,
                'summary': summary,
                'original_length': len(text),
                'summary_length': len(summary),
                'compression_ratio': round(len(summary) / len(text) * 100, 1),
                'summary_type': summary_type
            })
            
        else:
            # Standard summary (brief, detailed, comprehensive)
            summary = generate_summary(text, summary_type)
            return jsonify({
                'success': True,
                'summary': summary,
                'original_length': len(text),
                'summary_length': len(summary),
                'compression_ratio': round(len(summary) / len(text) * 100, 1),
                'summary_type': summary_type
            })
            
    except Exception as e:
        print(f"❌ Summarization error: {str(e)}")
        return jsonify({'success': False, 'error': f'Summarization failed: {str(e)}'}), 500

# 4. Add new endpoint for re-summarizing existing files
@app.route('/file/<file_id>/re-summarize', methods=['POST'])
def re_summarize_file(file_id):
    """Re-generate summary for existing file with enhanced options"""
    try:
        data = request.get_json() or {}
        summary_type = data.get('type', 'detailed')
        output_format = data.get('format', 'standard')  # standard, structured, multi-level
        
        files_collection = db["files"]
        
        # Build query safely
        if ObjectId.is_valid(file_id):
            query = {"$or": [{"filename": file_id}, {"_id": ObjectId(file_id)}]}
        else:
            query = {"filename": file_id}

        file_doc = files_collection.find_one(query)
        
        if not file_doc:
            return jsonify({"success": False, "error": "File not found"}), 404
        
        text_content = file_doc.get('content', '') or file_doc.get('text', '')
        
        if not text_content:
            return jsonify({"success": False, "error": "No text content to summarize"}), 400
        
        # Generate new summary based on format
        update_data = {
            'last_summarized': datetime.utcnow(),
            'summary_type': summary_type
        }
        
        if output_format == 'structured':
            result = generate_long_structured_summary(text_content, summary_type)
            update_data.update({
                'summary': result.get('full_summary', ''),
                'structured_summary': result,
                'summary_length': len(result.get('full_summary', '')),
                'compression_ratio': round(len(result.get('full_summary', '')) / len(text_content) * 100, 1),
                'has_structured_summary': True
            })
            response_data = {
                "structured_summary": result,
                "standard_summary": result.get('full_summary', '')
            }
            
        elif output_format == 'multi-level':
            result = generate_multi_level_summary(text_content)
            # Store the comprehensive summary as the main summary
            main_summary = result.get('comprehensive_summary', result.get('detailed_summary', ''))
            update_data.update({
                'summary': main_summary,
                'multi_level_summary': result,
                'summary_length': len(main_summary),
                'compression_ratio': round(len(main_summary) / len(text_content) * 100, 1),
                'has_multi_level_summary': True
            })
            response_data = {
                "multi_level_summary": result,
                "standard_summary": main_summary
            }
            
        else:
            # Standard summary
            new_summary = generate_summary(text_content, summary_type)
            update_data.update({
                'summary': new_summary,
                'summary_length': len(new_summary),
                'compression_ratio': round(len(new_summary) / len(text_content) * 100, 1),
                'structured_summary': None,  # Clear structured if switching to standard
                'has_structured_summary': False
            })
            response_data = {
                "standard_summary": new_summary
            }
        
        files_collection.update_one(
            {"_id": file_doc["_id"]},
            {"$set": update_data}
        )
        
        return jsonify({
            "success": True,
            "message": f"File re-summarized with {summary_type} detail level and {output_format} format",
            **response_data,
            "summary_length": update_data.get('summary_length', 0),
            "compression_ratio": update_data.get('compression_ratio', 0)
        }), 200
        
    except Exception as e:
        print(f"❌ Error re-summarizing file: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# 5. Update the /summary/<file_id> endpoint to include structured data
@app.route('/summary/<file_id>', methods=['GET'])
def get_summary(file_id):
    """Fetch summary + content with enhanced details"""
    try:
        include_structured = request.args.get('structured', 'false').lower() == 'true'
        
        files_collection = db["files"]

        # Build query safely
        if ObjectId.is_valid(file_id):
            query = {"$or": [{"filename": file_id}, {"_id": ObjectId(file_id)}]}
        else:
            query = {"filename": file_id}

        file_doc = files_collection.find_one(query)

        if not file_doc:
            return jsonify({"success": False, "error": "File not found"}), 404

        response_data = {
            "success": True,
            "file_id": str(file_doc["_id"]),
            "original_name": file_doc.get("original_name", "Untitled Document"),
            "filename": file_doc.get("filename"),
            "summary": file_doc.get("summary", "No summary available"),
            "content": file_doc.get("content", ""),
            "summary_type": file_doc.get("summary_type", "unknown"),
            "compression_ratio": file_doc.get("compression_ratio", 0),
            "last_summarized": file_doc.get("last_summarized", "").isoformat() if file_doc.get("last_summarized") else None
        }
        
        # Include structured summary if requested and available
        if include_structured and file_doc.get("structured_summary"):
            response_data["structured_summary"] = file_doc["structured_summary"]
        
        return jsonify(response_data), 200

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