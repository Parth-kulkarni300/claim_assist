
import pytest
from unittest.mock import patch, MagicMock


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_response(content: str):
    """Build a minimal mock OpenAI chat-completion response."""
    msg = MagicMock()
    msg.content = content
    choice = MagicMock()
    choice.message = msg
    resp = MagicMock()
    resp.choices = [choice]
    return resp


# ---------------------------------------------------------------------------
# analyze_damage – offline unit tests (no real API calls)
# ---------------------------------------------------------------------------

class TestAnalyzeDamage:
    """Tests for src.vision.analyze_damage."""

    def _call(self, content: str, monkeypatch):
        """Patch the env and the OpenAI client, then call analyze_damage."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
        mock_response = _make_response(content)

        with patch("src.vision.OpenAI") as MockClient:
            instance = MockClient.return_value
            instance.chat.completions.create.return_value = mock_response
            from src.vision import analyze_damage
            return analyze_damage("samples/car1.jpg")

    # ------------------------------------------------------------------
    def test_valid_damage_response(self, monkeypatch, tmp_path):
        """A well-formed JSON response from the model should be returned as-is."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
        valid_json = (
            '{"damages":[{"part":"front_bumper","damage_type":"scratch",'
            '"severity":"minor"}],'
            '"uncertainties":[],"human_review_required":false}'
        )
        mock_response = _make_response(valid_json)

        # Patch both the client and the image encoder so no real file is needed
        with patch("src.vision.OpenAI") as MockClient, \
             patch("src.vision.encode_image", return_value=("base64data", "image/jpeg")):
            instance = MockClient.return_value
            instance.chat.completions.create.return_value = mock_response
            from src.vision import analyze_damage
            result = analyze_damage("fake/path.jpg")

        assert result["human_review_required"] is False
        assert len(result["damages"]) == 1
        assert result["damages"][0]["part"] == "front_bumper"

    def test_invalid_json_returns_safe_fallback(self, monkeypatch):
        """Non-JSON model output should trigger human review, not an exception."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
        mock_response = _make_response("Sorry, I cannot analyze this image.")

        with patch("src.vision.OpenAI") as MockClient, \
             patch("src.vision.encode_image", return_value=("b64", "image/jpeg")):
            instance = MockClient.return_value
            instance.chat.completions.create.return_value = mock_response
            from src.vision import analyze_damage
            result = analyze_damage("fake/path.jpg")

        assert result["human_review_required"] is True
        assert result["damages"] == []
        assert len(result["uncertainties"]) > 0

    def test_invalid_schema_returns_safe_fallback(self, monkeypatch):
        """JSON with wrong schema should trigger human review."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
        bad_json = '{"result": "no_damage"}'  # missing required keys
        mock_response = _make_response(bad_json)

        with patch("src.vision.OpenAI") as MockClient, \
             patch("src.vision.encode_image", return_value=("b64", "image/jpeg")):
            instance = MockClient.return_value
            instance.chat.completions.create.return_value = mock_response
            from src.vision import analyze_damage
            result = analyze_damage("fake/path.jpg")

        assert result["human_review_required"] is True

    def test_invalid_severity_returns_safe_fallback(self, monkeypatch):
        """A damage entry with an invalid severity should trigger human review."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
        bad_severity = (
            '{"damages":[{"part":"hood","damage_type":"dent","severity":"extreme"}],'
            '"uncertainties":[],"human_review_required":false}'
        )
        mock_response = _make_response(bad_severity)

        with patch("src.vision.OpenAI") as MockClient, \
             patch("src.vision.encode_image", return_value=("b64", "image/jpeg")):
            instance = MockClient.return_value
            instance.chat.completions.create.return_value = mock_response
            from src.vision import analyze_damage
            result = analyze_damage("fake/path.jpg")

        assert result["human_review_required"] is True

    def test_api_connection_error_returns_safe_fallback(self, monkeypatch):
        """An APIConnectionError should not propagate; safe fallback is returned."""
        from openai import APIConnectionError
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

        with patch("src.vision.OpenAI") as MockClient, \
             patch("src.vision.encode_image", return_value=("b64", "image/jpeg")):
            instance = MockClient.return_value
            instance.chat.completions.create.side_effect = APIConnectionError(
                request=MagicMock()
            )
            from src.vision import analyze_damage
            result = analyze_damage("fake/path.jpg")

        assert result["human_review_required"] is True
        assert any("connection" in u.lower() for u in result["uncertainties"])

    def test_api_status_error_returns_safe_fallback(self, monkeypatch):
        """An HTTP error from the API should return a safe fallback."""
        from openai import APIStatusError
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

        with patch("src.vision.OpenAI") as MockClient, \
             patch("src.vision.encode_image", return_value=("b64", "image/jpeg")):
            instance = MockClient.return_value
            instance.chat.completions.create.side_effect = APIStatusError(
                message="Unauthorized",
                response=MagicMock(status_code=401),
                body=None,
            )
            from src.vision import analyze_damage
            result = analyze_damage("fake/path.jpg")

        assert result["human_review_required"] is True

    def test_missing_api_key_raises(self, monkeypatch):
        """Missing OPENROUTER_API_KEY must raise ValueError immediately."""
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
        monkeypatch.delenv("API_KEY", raising=False)

        from src.vision import analyze_damage
        with pytest.raises(ValueError, match="OPENROUTER_API_KEY"):
            analyze_damage("fake/path.jpg")

    def test_missing_image_raises(self, monkeypatch):
        """A non-existent image path must raise FileNotFoundError."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

        from src.vision import analyze_damage
        with pytest.raises(FileNotFoundError):
            analyze_damage("no_such_file_abc123.jpg")

    def test_markdown_fenced_json_is_parsed(self, monkeypatch):
        """Model may wrap JSON in ```json ... ``` – strip it before parsing."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
        fenced = (
            "```json\n"
            '{"damages":[],"uncertainties":["No visible damage"],'
            '"human_review_required":false}\n'
            "```"
        )
        mock_response = _make_response(fenced)

        with patch("src.vision.OpenAI") as MockClient, \
             patch("src.vision.encode_image", return_value=("b64", "image/jpeg")):
            instance = MockClient.return_value
            instance.chat.completions.create.return_value = mock_response
            from src.vision import analyze_damage
            result = analyze_damage("fake/path.jpg")

        assert result["human_review_required"] is False
        assert result["damages"] == []

    def test_human_review_flag_passthrough(self, monkeypatch):
        """If model sets human_review_required=true, it should be preserved."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
        review_json = (
            '{"damages":[],'
            '"uncertainties":["Image is too dark to assess damage"],'
            '"human_review_required":true}'
        )
        mock_response = _make_response(review_json)

        with patch("src.vision.OpenAI") as MockClient, \
             patch("src.vision.encode_image", return_value=("b64", "image/jpeg")):
            instance = MockClient.return_value
            instance.chat.completions.create.return_value = mock_response
            from src.vision import analyze_damage
            result = analyze_damage("fake/path.jpg")

        assert result["human_review_required"] is True
        assert "Image is too dark" in result["uncertainties"][0]
