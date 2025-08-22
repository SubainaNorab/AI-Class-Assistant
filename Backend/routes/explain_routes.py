# Backend/routes/explain_routes.py
from flask import Blueprint, request, jsonify
from bson import ObjectId
import datetime
from utils.complexityAnalyzer import ComplexityAnalyzer
from utils.explainerLLM import explain_difficult_parts
from database import get_db

explain_bp = Blueprint("explain", __name__)

def safe_objectid(val):
    """Try converting to ObjectId, fallback to string."""
    try:
        return ObjectId(val)
    except Exception:
        return val  # keep as plain string


@explain_bp.route("/explain", methods=["POST"])
def explain_complex_content():
    try:
        data = request.get_json(force=True)
        file_id = data.get("fileId")
        user_id = data.get("userId")

        if not file_id or not user_id:
            return jsonify({"error": "fileId and userId are required"}), 400

        # Get database connection
        db = get_db()
        files_collection = db["files"]
        explanations_collection = db["explanations"]

        print("📂 Collections available:", db.list_collection_names())
        print(f"🔎 Looking for file with ID: {file_id}")

        # Fetch the file content (handle ObjectId vs string IDs)
        file_doc = files_collection.find_one({"_id": safe_objectid(file_id)})

        if not file_doc:
            return jsonify({"error": "File not found"}), 404

        # Use text or summary based on availability
        text_content = (
            file_doc.get("content")
            or file_doc.get("summary")
            or file_doc.get("text")
        )
        if not text_content:
            return jsonify({"error": "No text content available"}), 400

        # Analyze difficult parts
        analyzer = ComplexityAnalyzer()
        difficult_parts = analyzer.find_difficult_parts(text_content)

        # Ask LLM for explanations
        explanations = explain_difficult_parts(difficult_parts)

        # Store explanations in database
        explanation_doc = {
            "userId": safe_objectid(user_id),
            "fileId": safe_objectid(file_id),
            "explanations": explanations,
            "createdAt": datetime.datetime.utcnow(),
            "updatedAt": datetime.datetime.utcnow(),
        }
        result = explanations_collection.insert_one(explanation_doc)

        return jsonify({
            "success": True,
            "explanationId": str(result.inserted_id),
            "explanations": explanations
        }), 200

    except Exception as e:
        print("❌ Error in /explain:", e)
        return jsonify({"error": str(e)}), 500


@explain_bp.route("/explanations/<file_id>", methods=["GET"])
def get_explanations(file_id):
    try:
        user_id = request.args.get("userId")

        db = get_db()
        explanations_collection = db["explanations"]

        # Find explanations for this file and user
        explanation_doc = explanations_collection.find_one({
            "fileId": safe_objectid(file_id),
            "userId": safe_objectid(user_id)
        })

        if not explanation_doc:
            return jsonify({"error": "No explanations found"}), 404

        # Convert ObjectId to string for JSON response
        explanation_doc["_id"] = str(explanation_doc["_id"])
        explanation_doc["userId"] = str(explanation_doc["userId"])
        explanation_doc["fileId"] = str(explanation_doc["fileId"])

        return jsonify(explanation_doc), 200

    except Exception as e:
        print("❌ Error in /explanations/<file_id>:", e)
        return jsonify({"error": str(e)}), 500
