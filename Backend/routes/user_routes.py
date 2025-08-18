# Backend/routes/user_routes.py
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from bson import ObjectId
import re
from database import user_collection  # ✅ import from your db setup

user_bp = Blueprint('users', __name__)

# ---------- Validation Helpers ----------
def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"


# ---------- Signup ----------
@user_bp.route('/users/signup', methods=['POST'])
def signup():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    for field in ['email', 'password', 'full_name']:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    email = data['email'].lower().strip()
    password = data['password']
    full_name = data['full_name'].strip()

    # validate
    if not validate_email(email):
        return jsonify({'error': 'Invalid email format'}), 400
    ok, msg = validate_password(password)
    if not ok:
        return jsonify({'error': msg}), 400

    # check if exists
    if user_collection.find_one({'email': email}):
        return jsonify({'error': 'User already exists with this email'}), 409

    # insert
    password_hash = generate_password_hash(password)
    user_doc = {
        "email": email,
        "password_hash": password_hash,
        "full_name": full_name
    }
    result = user_collection.insert_one(user_doc)

    return jsonify({
        'message': 'User created successfully',
        'user': {
            'id': str(result.inserted_id),
            'email': email,
            'full_name': full_name
        }
    }), 201


# ---------- Login ----------
@user_bp.route('/users/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = data.get('email', '').lower().strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = user_collection.find_one({'email': email})
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid email or password'}), 401

    # create JWT token
    access_token = create_access_token(identity=str(user['_id']))
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': {
            'id': str(user['_id']),
            'email': user['email'],
            'full_name': user['full_name']
        }
    }), 200


# ---------- Me (Protected) ----------
@user_bp.route('/users/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = user_collection.find_one({'_id': ObjectId(user_id)}, {"password_hash": 0})
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user['id'] = str(user['_id'])
    del user['_id']

    return jsonify({'user': user}), 200
