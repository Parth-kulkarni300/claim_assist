
"""
Seed sample claims for ClaimAssist.
Run: python seed_claims.py
"""

import json
import shutil
from datetime import datetime, timedelta
from pathlib import Path

CLAIMS_FILE = Path("claims.json")
UPLOADS_DIR = Path("uploads")
SAMPLES_DIR = Path("samples")


def seed():
    UPLOADS_DIR.mkdir(exist_ok=True)

    # Copy sample image if available
    sample_src = SAMPLES_DIR / "car1.jpg"
    img1_name = "seed_car_01.jpg"
    img2_name = "seed_car_02.jpg"
    img3_name = "seed_car_03.jpg"

    if sample_src.exists():
        shutil.copy(sample_src, UPLOADS_DIR / img1_name)
        shutil.copy(sample_src, UPLOADS_DIR / img2_name)
        shutil.copy(sample_src, UPLOADS_DIR / img3_name)

    now = datetime.now()

    sample_claims = {
        "CLM1001": {
            "id": "CLM1001",
            "customer_name": "Aarav Sharma",
            "vehicle_number": "DL03CC1234",
            "image_filename": img1_name if sample_src.exists() else None,
            "submitted_at": (now - timedelta(hours=3)).isoformat(),
            "status": "pending",
            "vision_result": {
                "damages": [
                    {"part": "front_bumper", "damage_type": "scratch", "severity": "minor"},
                    {"part": "headlight", "damage_type": "crack", "severity": "minor"},
                ],
                "uncertainties": [],
                "human_review_required": False,
            },
            "pricing_result": {
                "status": "estimate_ready",
                "total_repair_estimate_inr": 3500,
                "deductible_inr": 1000,
                "policy_limit_inr": 50000,
                "estimated_payout_inr": 2500,
                "breakdown": [
                    {"part": "front_bumper", "damage_type": "scratch", "severity": "minor", "estimated_repair_cost_inr": 1500},
                    {"part": "headlight", "damage_type": "crack", "severity": "minor", "estimated_repair_cost_inr": 2000},
                ],
            },
            "approved_amount": None,
            "reject_reason": None,
            "processed_at": None,
        },
        "CLM1002": {
            "id": "CLM1002",
            "customer_name": "Sunita Verma",
            "vehicle_number": "MH12AB5678",
            "image_filename": img2_name if sample_src.exists() else None,
            "submitted_at": (now - timedelta(days=1)).isoformat(),
            "status": "approved",
            "vision_result": {
                "damages": [
                    {"part": "hood", "damage_type": "dent", "severity": "moderate"},
                    {"part": "front_bumper", "damage_type": "dent", "severity": "moderate"},
                ],
                "uncertainties": [],
                "human_review_required": False,
            },
            "pricing_result": {
                "status": "estimate_ready",
                "total_repair_estimate_inr": 8500,
                "deductible_inr": 1000,
                "policy_limit_inr": 50000,
                "estimated_payout_inr": 7500,
                "breakdown": [
                    {"part": "hood", "damage_type": "dent", "severity": "moderate", "estimated_repair_cost_inr": 5000},
                    {"part": "front_bumper", "damage_type": "dent", "severity": "moderate", "estimated_repair_cost_inr": 3500},
                ],
            },
            "approved_amount": 7500,
            "reject_reason": None,
            "processed_at": (now - timedelta(hours=18)).isoformat(),
        },
        "CLM1003": {
            "id": "CLM1003",
            "customer_name": "Vikram Malhotra",
            "vehicle_number": "KA05MN9012",
            "image_filename": img3_name if sample_src.exists() else None,
            "submitted_at": (now - timedelta(days=2)).isoformat(),
            "status": "rejected",
            "vision_result": {
                "damages": [
                    {"part": "door", "damage_type": "scratch", "severity": "minor"},
                ],
                "uncertainties": ["Pre-existing scratch on left door noted in prior inspection"],
                "human_review_required": False,
            },
            "pricing_result": {
                "status": "estimate_ready",
                "total_repair_estimate_inr": 1800,
                "deductible_inr": 1000,
                "policy_limit_inr": 50000,
                "estimated_payout_inr": 800,
                "breakdown": [
                    {"part": "door", "damage_type": "scratch", "severity": "minor", "estimated_repair_cost_inr": 1800},
                ],
            },
            "approved_amount": None,
            "reject_reason": "Damage pre-dates current policy effective date.",
            "processed_at": (now - timedelta(days=1, hours=4)).isoformat(),
        },
    }

    with CLAIMS_FILE.open("w", encoding="utf-8") as f:
        json.dump(sample_claims, f, indent=2)

    print(f"Successfully seeded {len(sample_claims)} demo claims into {CLAIMS_FILE}")


if __name__ == "__main__":
    seed()
