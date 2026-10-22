
import pytest
from src.pricing import estimate_claim, normalize_part, normalize_damage_type


def test_known_damage_estimate():
    result = estimate_claim({
        "damages": [
            {
                "part": "front_bumper",
                "damage_type": "scratch",
                "severity": "minor",
            }
        ],
        "uncertainties": [],
        "human_review_required": False,
    })

    assert result["status"] == "estimate_ready"
    assert result["total_repair_estimate_inr"] == 1500
    assert result["estimated_payout_inr"] == 500


def test_unknown_damage_requires_review():
    result = estimate_claim({
        "damages": [
            {
                "part": "unknown_part",
                "damage_type": "scratch",
                "severity": "minor",
            }
        ],
        "uncertainties": [],
        "human_review_required": False,
    })

    assert result["status"] == "human_review"


def test_blurry_photo_requires_review():
    result = estimate_claim({
        "damages": [],
        "uncertainties": ["Photo is blurry"],
        "human_review_required": True,
    })

    assert result["status"] == "human_review"


def test_normalized_part_lookup():
    """Verify that specific natural-language part names map to catalog prices."""
    result = estimate_claim({
        "damages": [
            {
                "part": "front_right_headlight",
                "damage_type": "shattered",
                "severity": "severe",
            },
            {
                "part": "passenger_door",
                "damage_type": "dent",
                "severity": "severe",
            },
        ],
        "uncertainties": [],
        "human_review_required": False,
    })

    assert result["status"] == "estimate_ready"
    # headlight shattered severe = 8000, door dent severe = 7500 => total 15500
    assert result["total_repair_estimate_inr"] == 15500
    # 15500 - 1000 deductible = 14500
    assert result["estimated_payout_inr"] == 14500


def test_damage_type_synonyms_lookup():
    """Verify that synonyms like scrape map to scratch, and ding maps to dent."""
    result = estimate_claim({
        "damages": [
            {
                "part": "front_bumper",
                "damage_type": "scrape",
                "severity": "minor",
            }
        ],
        "uncertainties": [],
        "human_review_required": False,
    })

    assert result["status"] == "estimate_ready"
    assert result["total_repair_estimate_inr"] == 1500


def test_policy_limit_capping():
    """Verify that estimated payout is capped at the policy limit."""
    result = estimate_claim(
        {
            "damages": [
                {
                    "part": "roof",
                    "damage_type": "dent",
                    "severity": "severe",
                }
            ],
            "uncertainties": [],
            "human_review_required": False,
        },
        deductible_inr=1000,
        policy_limit_inr=5000,  # Lower limit than repair cost (12000)
    )

    assert result["status"] == "estimate_ready"
    assert result["total_repair_estimate_inr"] == 12000
    assert result["estimated_payout_inr"] == 5000


def test_negative_deductible_raises():
    with pytest.raises(ValueError):
        estimate_claim({}, deductible_inr=-100)
