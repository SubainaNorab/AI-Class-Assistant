from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from summarizer import generate_summary 
import os
import json
from datetime import datetime
from werkzeug.utils import secure_filename
import mimetypes
from utils.quiz_generator import build_prompt, call_ai_model
<<<<<<< HEAD
from database import quiz_collection, flashcard_collection

=======
from utils.flashcard_generator import generate_flashcards
import sqlite3
import hashlib
>>>>>>> c7ca0182e83d007397ecfba1f01c5638ffb1596a

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Get the directory where this script is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Configuration - use absolute paths
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB in bytes
UPLOAD_LOG_FILE = os.path.join(BASE_DIR, 'upload_log.json')

# Allowed file extensions and MIME types
ALLOWED_EXTENSIONS = {
    'pdf': ['application/pdf'],
    'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    'mp3': ['audio/mpeg', 'audio/mp3'],
    'wav': ['audio/wav', 'audio/wave', 'audio/x-wav'],
    'opus': ['audio/opus', 'audio/ogg']  # added support for OPUS
}

# Create necessary directories with absolute paths
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'pdfs'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'documents'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'presentations'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'audio'), exist_ok=True)

# Initialize upload log if it doesn't exist
if not os.path.exists(UPLOAD_LOG_FILE):
    with open(UPLOAD_LOG_FILE, 'w') as f:
        json.dump([], f)

def allowed_file(filename):
    """Check if file extension is allowed"""
    if '.' not in filename:
        return False
    
    extension = filename.rsplit('.', 1)[1].lower()
    return extension in ALLOWED_EXTENSIONS

def get_file_category(filename):
    """Determine file category based on extension"""
    extension = filename.rsplit('.', 1)[1].lower()
    if extension == 'pdf':
        return 'pdfs'
    elif extension == 'docx':
        return 'documents'
    elif extension == 'pptx':
        return 'presentations'
    elif extension in ['mp3', 'wav','opus']:
        return 'audio'
    return 'other'

def validate_file_type(file):
    """Validate file type using MIME type"""
    if not file.filename:
        return False
    
    extension = file.filename.rsplit('.', 1)[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        return False
    
    # Check MIME type
    mime_type = file.content_type
    allowed_mimes = ALLOWED_EXTENSIONS[extension]
    
    return mime_type in allowed_mimes

def log_upload(filename, original_filename, file_size, category, file_path):
    """Log upload metadata to JSON file"""
    try:
        with open(UPLOAD_LOG_FILE, 'r') as f:
            logs = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        logs = []
    
    log_entry = {
        'id': len(logs) + 1,
        'original_filename': original_filename,
        'stored_filename': filename,
        'file_size': file_size,
        'category': category,
        'file_path': file_path,
        'upload_timestamp': datetime.now().isoformat(),
        'status': 'uploaded'
    }
    
    logs.append(log_entry)
    
    with open(UPLOAD_LOG_FILE, 'w') as f:
        json.dump(logs, f, indent=2)
    
    return log_entry

@app.route('/')
def index():
    """Serve the main page"""
    frontend_path = os.path.join(BASE_DIR, 'frontend', 'public')
    if os.path.exists(frontend_path):
        return send_from_directory(frontend_path, 'index.html')
    else:
        return jsonify({
            'message': 'File Upload API Server',
            'status': 'running',
            'endpoints': ['/upload', '/uploads', '/uploads/stats', '/summarize']
        })

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload"""
    try:
        # Check if file is present in request
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Validate file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)  # Reset file pointer
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'success': False,
                'error': f'File size exceeds maximum limit of {MAX_FILE_SIZE // (1024*1024)} MB'
            }), 400
        
        # Validate file type
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': 'File type not allowed. Supported formats: PDF, DOCX, PPTX, MP3, WAV, OPUS'
            }), 400
        
        # Additional MIME type validation
        if not validate_file_type(file):
            return jsonify({
                'success': False,
                'error': 'Invalid file type or corrupted file'
            }), 400
        
        # Secure the filename and prepare storage
        original_filename = file.filename
        filename = secure_filename(original_filename)
        
        # Add timestamp to avoid conflicts
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        name, ext = os.path.splitext(filename)
        filename = f"{name}_{timestamp}{ext}"
        
        # Determine category and create appropriate path
        category = get_file_category(original_filename)
        category_folder = os.path.join(UPLOAD_FOLDER, category)
        file_path = os.path.join(category_folder, filename)
        
        # Save the file
        file.save(file_path)
        
        # Log the upload
        log_entry = log_upload(filename, original_filename, file_size, category, file_path)
        
        return jsonify({
            'success': True,
            'message': 'File uploaded successfully',
            'data': {
                'file_id': log_entry['id'],
                'filename': filename,
                'original_filename': original_filename,
                'size': file_size,
                'category': category,
                'upload_time': log_entry['upload_timestamp']
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Upload failed: {str(e)}'
        }), 500

def init_flashcard_db():
    """Initialize SQLite database for flashcards"""
    conn = sqlite3.connect('flashcards.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS flashcards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content_hash TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT DEFAULT 'default_user'
        )
    ''')
    
    conn.commit()
    conn.close()

def save_flashcards_to_db(flashcards, content_hash, user_id='default_user'):
    """Save flashcards to database"""
    conn = sqlite3.connect('flashcards.db')
    cursor = conn.cursor()
    
    saved_ids = []
    for flashcard in flashcards:
        cursor.execute('''
            INSERT INTO flashcards (content_hash, question, answer, user_id)
            VALUES (?, ?, ?, ?)
        ''', (content_hash, flashcard['question'], flashcard['answer'], user_id))
        saved_ids.append(cursor.lastrowid)
    
    conn.commit()
    conn.close()
    return saved_ids

def get_flashcards_from_db(content_hash=None, user_id='default_user'):
    """Retrieve flashcards from database"""
    conn = sqlite3.connect('flashcards.db')
    cursor = conn.cursor()
    
    if content_hash:
        cursor.execute('''
            SELECT id, question, answer, created_at 
            FROM flashcards 
            WHERE content_hash = ? AND user_id = ?
            ORDER BY created_at DESC
        ''', (content_hash, user_id))
    else:
        cursor.execute('''
            SELECT id, question, answer, created_at 
            FROM flashcards 
            WHERE user_id = ?
            ORDER BY created_at DESC
        ''', (user_id,))
    
    flashcards = []
    for row in cursor.fetchall():
        flashcards.append({
            'id': row[0],
            'question': row[1],
            'answer': row[2],
            'created_at': row[3]
        })
    
    conn.close()
    return flashcards


@app.route('/uploads', methods=['GET'])
def list_uploads():
    """List all uploaded files"""
    try:
        with open(UPLOAD_LOG_FILE, 'r') as f:
            logs = json.load(f)
        
        return jsonify({
            'success': True,
            'uploads': logs
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to retrieve uploads: {str(e)}'
        }), 500

@app.route('/uploads/<int:file_id>', methods=['DELETE'])
def delete_upload(file_id):
    """Delete an uploaded file"""
    try:
        with open(UPLOAD_LOG_FILE, 'r') as f:
            logs = json.load(f)
        
        # Find the file to delete
        file_to_delete = None
        for log in logs:
            if log['id'] == file_id:
                file_to_delete = log
                break
        
        if not file_to_delete:
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        # Delete the physical file
        if os.path.exists(file_to_delete['file_path']):
            os.remove(file_to_delete['file_path'])
        
        # Update the log
        logs = [log for log in logs if log['id'] != file_id]
        
        with open(UPLOAD_LOG_FILE, 'w') as f:
            json.dump(logs, f, indent=2)
        
        return jsonify({
            'success': True,
            'message': 'File deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to delete file: {str(e)}'
        }), 500

@app.route('/uploads/stats', methods=['GET'])
def upload_stats():
    """Get upload statistics"""
    try:
        with open(UPLOAD_LOG_FILE, 'r') as f:
            logs = json.load(f)
        
        stats = {
            'total_files': len(logs),
            'total_size': sum(log['file_size'] for log in logs),
            'categories': {},
            'recent_uploads': sorted(logs, key=lambda x: x['upload_timestamp'], reverse=True)[:5]
        }
        
        # Category breakdown
        for log in logs:
            category = log['category']
            if category not in stats['categories']:
                stats['categories'][category] = {'count': 0, 'size': 0}
            stats['categories'][category]['count'] += 1
            stats['categories'][category]['size'] += log['file_size']
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get statistics: {str(e)}'
        }), 500

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify({
        'success': False,
        'error': f'File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)} MB'
    }), 413

## summarization endpoint

@app.route('/summarize', methods=['POST'])
def summarize_text():
    """
    API endpoint to summarize text
    Expects JSON payload with 'text' field
    Returns JSON with 'summary' field or error message
    """
    data = request.get_json()
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    # Limit text length to 1000 characters
    if len(text) > 1000:
        text = text[:1000]
    
    try:
        summary = generate_summary(text)
        return jsonify({'summary': summary})
    except Exception as e:
        return jsonify({'error': f'Summarization failed: {str(e)}'}), 500
    

@app.route("/generate_quiz", methods=["POST"])
def generate_quiz():
    data = request.json
    summary = data.get("summary")

    if not summary:
        return jsonify({"error": "Summary is required"}), 400

    prompt = build_prompt(summary)
    result = call_ai_model(prompt)

    # Try saving to DB if quiz and flashcards exist
    try:
        if "quiz" in result:
            quiz_collection.insert_many(result["quiz"])
        if "flashcards" in result:
            flashcard_collection.insert_many(result["flashcards"])
    except Exception as e:
        return jsonify({"error": f"DB insert failed: {str(e)}"}), 500

    return jsonify(result)

#generate_flashcards endpoint:
# Replace your existing /generate_flashcards and /flashcards endpoints with these:

@app.route('/generate_flashcards', methods=['POST'])
def generate_flashcards_endpoint():
    """Generate flashcards from provided content with enhanced error reporting"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        content = data.get('content', '').strip()
        user_id = data.get('user_id', 'default_user')
        
        if not content:
            return jsonify({
                'success': False,
                'error': 'No content provided'
            }), 400
        
        # Limit content length to prevent API overuse
        if len(content) > 5000:
            content = content[:5000]
        
        # Generate a simple hash for content to avoid duplicates
        content_hash = hashlib.md5(content.encode()).hexdigest()
        
        # Check if flashcards already exist for this content
        existing_flashcards = get_flashcards_from_db(content_hash, user_id)
        if existing_flashcards:
            return jsonify({
                'success': True,
                'flashcards': existing_flashcards,
                'source': 'database',
                'message': 'Flashcards retrieved from database',
                'count': len(existing_flashcards)
            }), 200
        
        # Generate new flashcards
        result = generate_flashcards(content)
        
        if not result.get('success', False):
            return jsonify({
                'success': False,
                'error': result.get('error', 'Failed to generate flashcards'),
                'ai_status': result.get('ai_status', {})
            }), 500
        
        flashcards = result.get('flashcards', [])
        
        # Save to database
        try:
            saved_ids = save_flashcards_to_db(flashcards, content_hash, user_id)
            for i, flashcard in enumerate(flashcards):
                if i < len(saved_ids):
                    flashcard['id'] = saved_ids[i]
        except Exception as db_error:
            print(f"Database save error: {db_error}")
        
        # Prepare response
        response_data = {
            'success': True,
            'flashcards': flashcards,
            'source': result.get('source', 'unknown'),
            'count': len(flashcards),
            'message': result.get('user_message', 'Flashcards generated successfully')
        }
        
        # Add AI status information
        if 'ai_status' in result:
            response_data['ai_status'] = result['ai_status']
        
        if 'note' in result:
            response_data['note'] = result['note']
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Flashcard generation error: {e}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500

@app.route('/flashcards', methods=['GET'])
def get_all_flashcards():
    """Get all flashcards for a user"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        flashcards = get_flashcards_from_db(user_id=user_id)
        
        # Ensure proper JSON serialization
        serialized_flashcards = []
        for flashcard in flashcards:
            serialized_flashcards.append({
                'id': flashcard.get('id'),
                'question': str(flashcard.get('question', '')),
                'answer': str(flashcard.get('answer', '')),
                'created_at': flashcard.get('created_at')
            })
        
        return jsonify({
            'success': True,
            'flashcards': serialized_flashcards,
            'count': len(serialized_flashcards)
        }), 200
        
    except Exception as e:
        print(f"Get flashcards error: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to retrieve flashcards: {str(e)}'
        }), 500


if __name__ == '__main__':
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Upload log file: {UPLOAD_LOG_FILE}")
    print(f"Base directory: {BASE_DIR}")
    
    # Initialize flashcard database
    init_flashcard_db()
    print("Flashcard database initialized")
    
    app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE
    app.run(debug=True, host='0.0.0.0', port=5000)
