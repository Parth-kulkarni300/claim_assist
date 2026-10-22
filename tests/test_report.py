
from src.report import generate_report


def test_report_shows_human_review():
    vision_result = {
        "damages": [],
        "uncertainties": ["Photo is blurry"],
        "human_review_required": True,
    }

    pricing_result = {
        "status": "human_review",
        "reason": "The vision model requested human review.",
    }

    report = generate_report(vision_result, pricing_result)

    assert "CLAIM ASSESSMENT" in report
    assert "HUMAN REVIEW REQUIRED" in report
    assert "Photo is blurry" in report
