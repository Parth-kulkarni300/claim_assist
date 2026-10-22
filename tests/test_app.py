
import io
import json
import pytest
from unittest.mock import patch

from app import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    app.config["TESTING"] = True
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir(exist_ok=True)
    app.config["UPLOAD_FOLDER"] = upload_dir

    claims_file = tmp_path / "claims.json"
    monkeypatch.setattr("app.CLAIMS_FILE", claims_file)

    with app.test_client() as test_client:
        yield test_client


def test_home_page(client):
    res = client.get("/")
    assert res.status_code == 200
    assert b"ClaimAssist" in res.data


def test_customer_page(client):
    res = client.get("/customer")
    assert res.status_code == 200
    assert b"Customer Portal" in res.data


def test_insurer_page(client):
    res = client.get("/insurer")
    assert res.status_code == 200
    assert b"Insurance Dashboard" in res.data


def test_get_claims_empty(client):
    res = client.get("/api/claims")
    assert res.status_code == 200
    assert res.get_json() == []


def test_submit_claim_no_file(client):
    res = client.post("/api/claims", data={})
    assert res.status_code == 400
    assert "No image file provided" in res.get_json()["error"]


def test_submit_claim_disallowed_extension(client):
    data = {
        "image": (io.BytesIO(b"fake data"), "document.pdf"),
        "customer_name": "Test User",
    }
    res = client.post("/api/claims", data=data, content_type="multipart/form-data")
    assert res.status_code == 400
    assert "Unsupported file type" in res.get_json()["error"]


def test_submit_claim_success_and_retrieve(client):
    mock_vision = {
        "damages": [
            {
                "part": "front_bumper",
                "damage_type": "scratch",
                "severity": "minor",
            }
        ],
        "uncertainties": [],
        "human_review_required": False,
    }

    with patch("app.analyze_damage", return_value=mock_vision):
        data = {
            "image": (io.BytesIO(b"fake image bytes"), "car.jpg"),
            "customer_name": "Rohan Sharma",
            "vehicle_number": "DL01AB1234",
        }
        res = client.post("/api/claims", data=data, content_type="multipart/form-data")
        assert res.status_code == 201

        resp_data = res.get_json()
        claim_id = resp_data["claim_id"]
        assert resp_data["status"] == "pending"
        assert resp_data["pricing_status"] == "estimate_ready"

        # Check retrieval by ID
        get_res = client.get(f"/api/claims/{claim_id}")
        assert get_res.status_code == 200
        claim = get_res.get_json()
        assert claim["customer_name"] == "Rohan Sharma"
        assert claim["vehicle_number"] == "DL01AB1234"
        assert claim["status"] == "pending"
        assert claim["pricing_result"]["total_repair_estimate_inr"] == 1500

        # Check retrieval in all claims list
        list_res = client.get("/api/claims")
        assert list_res.status_code == 200
        all_claims = list_res.get_json()
        assert len(all_claims) == 1
        assert all_claims[0]["id"] == claim_id


def test_approve_claim_suggested_amount(client):
    mock_vision = {
        "damages": [
            {
                "part": "front_bumper",
                "damage_type": "scratch",
                "severity": "minor",
            }
        ],
        "uncertainties": [],
        "human_review_required": False,
    }

    with patch("app.analyze_damage", return_value=mock_vision):
        data = {
            "image": (io.BytesIO(b"test"), "car.jpg"),
            "customer_name": "Priya Patel",
            "vehicle_number": "MH02CD5678",
        }
        sub_res = client.post("/api/claims", data=data, content_type="multipart/form-data")
        claim_id = sub_res.get_json()["claim_id"]

    # Approve with default suggested payout (1500 - 1000 deductible = 500)
    appr_res = client.post(f"/api/claims/{claim_id}/approve", json={})
    assert appr_res.status_code == 200
    assert appr_res.get_json()["status"] == "approved"
    assert appr_res.get_json()["approved_amount"] == 500

    # Verify claim status in DB
    get_res = client.get(f"/api/claims/{claim_id}")
    claim = get_res.get_json()
    assert claim["status"] == "approved"
    assert claim["approved_amount"] == 500
    assert claim["processed_at"] is not None


def test_approve_claim_custom_amount(client):
    mock_vision = {
        "damages": [
            {
                "part": "front_bumper",
                "damage_type": "scratch",
                "severity": "minor",
            }
        ],
        "uncertainties": [],
        "human_review_required": False,
    }

    with patch("app.analyze_damage", return_value=mock_vision):
        data = {
            "image": (io.BytesIO(b"test"), "car.jpg"),
            "customer_name": "Amit Shah",
            "vehicle_number": "GJ01XY9999",
        }
        sub_res = client.post("/api/claims", data=data, content_type="multipart/form-data")
        claim_id = sub_res.get_json()["claim_id"]

    # Approve with custom amount
    appr_res = client.post(f"/api/claims/{claim_id}/approve", json={"amount": 1200})
    assert appr_res.status_code == 200
    assert appr_res.get_json()["approved_amount"] == 1200


def test_approve_claim_invalid_amount(client):
    mock_vision = {
        "damages": [{"part": "front_bumper", "damage_type": "scratch", "severity": "minor"}],
        "uncertainties": [],
        "human_review_required": False,
    }
    with patch("app.analyze_damage", return_value=mock_vision):
        sub_res = client.post(
            "/api/claims",
            data={"image": (io.BytesIO(b"test"), "car.jpg"), "customer_name": "A", "vehicle_number": "B"},
            content_type="multipart/form-data",
        )
        claim_id = sub_res.get_json()["claim_id"]

    res = client.post(f"/api/claims/{claim_id}/approve", json={"amount": "not-a-number"})
    assert res.status_code == 400


def test_reject_claim(client):
    mock_vision = {
        "damages": [{"part": "front_bumper", "damage_type": "scratch", "severity": "minor"}],
        "uncertainties": [],
        "human_review_required": False,
    }
    with patch("app.analyze_damage", return_value=mock_vision):
        sub_res = client.post(
            "/api/claims",
            data={"image": (io.BytesIO(b"test"), "car.jpg"), "customer_name": "Sunil V", "vehicle_number": "KA04M1234"},
            content_type="multipart/form-data",
        )
        claim_id = sub_res.get_json()["claim_id"]

    res = client.post(f"/api/claims/{claim_id}/reject", json={"reason": "Damage pre-dates policy effective date."})
    assert res.status_code == 200
    assert res.get_json()["status"] == "rejected"

    get_res = client.get(f"/api/claims/{claim_id}")
    claim = get_res.get_json()
    assert claim["status"] == "rejected"
    assert claim["reject_reason"] == "Damage pre-dates policy effective date."
    assert claim["processed_at"] is not None


def test_double_process_conflict(client):
    mock_vision = {
        "damages": [{"part": "front_bumper", "damage_type": "scratch", "severity": "minor"}],
        "uncertainties": [],
        "human_review_required": False,
    }
    with patch("app.analyze_damage", return_value=mock_vision):
        sub_res = client.post(
            "/api/claims",
            data={"image": (io.BytesIO(b"test"), "car.jpg"), "customer_name": "User", "vehicle_number": "KA01A1"},
            content_type="multipart/form-data",
        )
        claim_id = sub_res.get_json()["claim_id"]

    # Approve once
    res1 = client.post(f"/api/claims/{claim_id}/approve", json={})
    assert res1.status_code == 200

    # Approving again should return 409 Conflict
    res2 = client.post(f"/api/claims/{claim_id}/approve", json={})
    assert res2.status_code == 409

    # Rejecting an approved claim should return 409 Conflict
    res3 = client.post(f"/api/claims/{claim_id}/reject", json={"reason": "test"})
    assert res3.status_code == 409


def test_nonexistent_claim_operations(client):
    assert client.get("/api/claims/DOESNOTEXIST").status_code == 404
    assert client.post("/api/claims/DOESNOTEXIST/approve", json={}).status_code == 404
    assert client.post("/api/claims/DOESNOTEXIST/reject", json={}).status_code == 404


def test_serve_nonexistent_asset(client):
    assert client.get("/assets/nonexistent_bundle.js").status_code == 404

