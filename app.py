
import os
import json
import uuid
from datetime import datetime
from pathlib import Path

from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

from src.vision import analyze_damage
from src.pricing import estimate_claim
from src.report import generate_report

load_dotenv()

app = Flask(__name__)
CORS(app)
app.config["UPLOAD_FOLDER"] = Path("uploads")
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB

CLAIMS_FILE = Path("claims.json")
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
FRONTEND_DIST = Path(__file__).resolve().parent / "frontend" / "dist"

# Ensure the uploads directory exists
app.config["UPLOAD_FOLDER"].mkdir(exist_ok=True)


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------

def load_claims() -> dict:
    if CLAIMS_FILE.exists():
        with CLAIMS_FILE.open() as f:
            return json.load(f)
    return {}


def save_claims(claims: dict) -> None:
    with CLAIMS_FILE.open("w") as f:
        json.dump(claims, f, indent=2, default=str)


def allowed_file(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


# ---------------------------------------------------------------------------
# Page routes (Serve React Frontend if built, fallback to Jinja)
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    if FRONTEND_DIST.exists():
        return send_from_directory(FRONTEND_DIST, "index.html")
    return render_template("index.html")


@app.route("/customer")
def customer_dashboard():
    if FRONTEND_DIST.exists():
        return send_from_directory(FRONTEND_DIST, "index.html")
    return render_template("customer.html")


@app.route("/insurer")
def insurer_dashboard():
    if FRONTEND_DIST.exists():
        return send_from_directory(FRONTEND_DIST, "index.html")
    return render_template("insurer.html")


@app.route("/assets/<path:filename>")
def serve_assets(filename):
    if FRONTEND_DIST.exists():
        return send_from_directory(FRONTEND_DIST / "assets", filename)
    return jsonify({"error": "Asset not found"}), 404


# ---------------------------------------------------------------------------
# API: Submit a new claim
# ---------------------------------------------------------------------------

@app.route("/api/claims", methods=["POST"])
def submit_claim():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided."}), 400

    file = request.files["image"]
    if not file or file.filename == "":
        return jsonify({"error": "No file selected."}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type. Use JPG, PNG, or WEBP."}), 400

    customer_name = (request.form.get("customer_name") or "Unknown Customer").strip()
    vehicle_number = (request.form.get("vehicle_number") or "N/A").strip()

    # Save the uploaded image
    ext = file.filename.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    image_path = app.config["UPLOAD_FOLDER"] / unique_name
    file.save(image_path)

    # Run AI analysis
    try:
        vision_result = analyze_damage(str(image_path))
    except FileNotFoundError:
        return jsonify({"error": "Image could not be read after upload."}), 500
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 500

    # Deterministic pricing from CSV
    pricing_result = estimate_claim(vision_result)

    # Generate full human-readable assessment report
    report_text = generate_report(vision_result, pricing_result)

    # Build claim record
    claim_id = uuid.uuid4().hex[:8].upper()
    claim = {
        "id": claim_id,
        "customer_name": customer_name,
        "vehicle_number": vehicle_number.upper(),
        "image_filename": unique_name,
        "submitted_at": datetime.now().isoformat(),
        "status": "pending",            # pending | approved | rejected
        "vision_result": vision_result,
        "pricing_result": pricing_result,
        "report_text": report_text,
        "approved_amount": None,
        "reject_reason": None,
        "processed_at": None,
    }

    claims = load_claims()
    claims[claim_id] = claim
    save_claims(claims)

    return jsonify({
        "claim_id": claim_id,
        "status": "pending",
        "human_review_required": vision_result.get("human_review_required", False),
        "pricing_status": pricing_result.get("status"),
    }), 201


# ---------------------------------------------------------------------------
# API: Get all claims (insurer) / specific claim
# ---------------------------------------------------------------------------

@app.route("/api/claims", methods=["GET"])
def get_all_claims():
    claims = load_claims()
    # Return newest-first
    sorted_claims = sorted(
        claims.values(),
        key=lambda c: c.get("submitted_at", ""),
        reverse=True,
    )
    return jsonify(sorted_claims)


@app.route("/api/claims/<claim_id>", methods=["GET"])
def get_claim(claim_id):
    claims = load_claims()
    claim = claims.get(claim_id.upper())
    if not claim:
        return jsonify({"error": "Claim not found."}), 404
    return jsonify(claim)


# ---------------------------------------------------------------------------
# API: Approve a claim
# ---------------------------------------------------------------------------

@app.route("/api/claims/<claim_id>/approve", methods=["POST"])
def approve_claim(claim_id):
    claims = load_claims()
    claim = claims.get(claim_id.upper())
    if not claim:
        return jsonify({"error": "Claim not found."}), 404
    if claim["status"] != "pending":
        return jsonify({"error": "Only pending claims can be approved."}), 409

    data = request.get_json(silent=True) or {}

    # Determine payout amount
    pricing = claim["pricing_result"]
    if "amount" in data:
        try:
            amount = int(data["amount"])
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid amount value."}), 400
    elif pricing.get("status") == "estimate_ready":
        amount = pricing["estimated_payout_inr"]
    elif pricing.get("known_damage_estimate_inr") is not None:
        amount = pricing["known_damage_estimate_inr"]
    else:
        amount = 0

    claim["status"] = "approved"
    claim["approved_amount"] = amount
    claim["processed_at"] = datetime.now().isoformat()

    save_claims(claims)
    return jsonify({"status": "approved", "approved_amount": amount})


# ---------------------------------------------------------------------------
# API: Reject a claim
# ---------------------------------------------------------------------------

@app.route("/api/claims/<claim_id>/reject", methods=["POST"])
def reject_claim(claim_id):
    claims = load_claims()
    claim = claims.get(claim_id.upper())
    if not claim:
        return jsonify({"error": "Claim not found."}), 404
    if claim["status"] != "pending":
        return jsonify({"error": "Only pending claims can be rejected."}), 409

    data = request.get_json(silent=True) or {}
    claim["status"] = "rejected"
    claim["reject_reason"] = (data.get("reason") or "Claim does not meet policy criteria.").strip()
    claim["processed_at"] = datetime.now().isoformat()

    save_claims(claims)
    return jsonify({"status": "rejected"})


# ---------------------------------------------------------------------------
# Serve uploaded images
# ---------------------------------------------------------------------------

@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
