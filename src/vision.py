
import os
import json
import time
import base64
import mimetypes
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI, APIConnectionError, APIStatusError, APITimeoutError

load_dotenv()

# ---------------------------------------------------------------------------
# Model information (for documentation / report metadata)
# ---------------------------------------------------------------------------
# Model:   google/gemma-4-31b-it  (Gemma 4 31B Instruct)
# License: Apache 2.0  (https://huggingface.co/google/gemma-4-31b-it)
# Provider: OpenRouter  (https://openrouter.ai/google/gemma-4-31b-it:free)
# Vision:  Yes – native multimodal (text + image_url)
# Verified: ID confirmed via https://openrouter.ai/api/v1/models (2026-10)
# Alternate: google/gemma-4-26b-a4b-it:free (MoE variant, also free+vision)
# ---------------------------------------------------------------------------

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "google/gemma-4-31b-it:free"

_ALLOWED_SEVERITIES = {"minor", "moderate", "severe"}

_SYSTEM_PROMPT = (
    "You analyze vehicle damage from photographs. "
    "Return only valid JSON with no markdown fences or extra text. "
    "Do not estimate repair prices or make insurance payout decisions. "
    "If the image is unclear, state that human review is required."
)

_USER_PROMPT = """\
Analyze this vehicle photo.

Return JSON in exactly this format:
{
  "damages": [
    {
      "part": "front_bumper",
      "damage_type": "scratch",
      "severity": "minor"
    }
  ],
  "uncertainties": [],
  "human_review_required": false
}

Rules:
- Standard automotive parts: front_bumper, rear_bumper, hood, fender, door, headlight, taillight, fog_light, grille, side_mirror, windshield, rear_windshield, window_glass, quarter_panel, trunk, roof, wheel.
- Standard damage types: scratch, dent, crack, broken, shattered, misaligned, dislodged.
- Use severity values: minor, moderate, or severe only.
- Use an empty damages list if no damage is identifiable.
- If the photo is blurry, obstructed, or insufficient to assess damage,
  set human_review_required to true and explain in uncertainties.
- Do not invent damage that cannot be clearly seen in the image.
- Return JSON only. No markdown code blocks. No extra explanation.
"""


def encode_image(image_path: str) -> tuple[str, str]:
    """
    Read an image, resize if excessively large (max 1024x1024),
    and return (base64_string, mime_type).

    Raises FileNotFoundError if the path does not exist.
    """
    path = Path(image_path)

    if not path.is_file():
        raise FileNotFoundError(f"Image not found: {image_path}")

    mime_type, _ = mimetypes.guess_type(str(path))
    if mime_type not in ("image/jpeg", "image/png", "image/webp"):
        mime_type = "image/jpeg"

    try:
        from PIL import Image
        import io
        with Image.open(path) as img:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            # Downscale large mobile uploads to standard 1024x1024 for faster vision processing
            max_size = (1024, 1024)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=82, optimize=True)
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            return b64, "image/jpeg"
    except Exception:
        with path.open("rb") as image_file:
            b64 = base64.b64encode(image_file.read()).decode("utf-8")
        return b64, mime_type


def _safe_fallback(reason: str) -> dict:
    """Return a safe human-review result when analysis cannot complete."""
    return {
        "damages": [],
        "uncertainties": [reason],
        "human_review_required": True,
    }


def _validate_vision_result(result: object) -> dict | None:
    """
    Validate the parsed JSON from the model.

    Returns the validated dict on success, or None if the structure is invalid.
    """
    if not isinstance(result, dict):
        return None
    if not isinstance(result.get("damages"), list):
        return None
    if not isinstance(result.get("uncertainties"), list):
        return None
    if not isinstance(result.get("human_review_required"), bool):
        return None

    for damage in result["damages"]:
        if not isinstance(damage, dict):
            return None
        if not isinstance(damage.get("part"), str) or not damage["part"].strip():
            return None
        if not isinstance(damage.get("damage_type"), str) or not damage["damage_type"].strip():
            return None
        if damage.get("severity") not in _ALLOWED_SEVERITIES:
            return None

    return result


def analyze_damage(image_path: str) -> dict:
    """
    Analyze vehicle damage in an image using Gemma 4 via OpenRouter.

    Returns a dict with keys:
        damages               – list of damage entries (may be empty)
        uncertainties         – list of uncertainty strings
        human_review_required – bool

    Never raises on API / model errors; instead returns a safe fallback
    dict with human_review_required=True so downstream code stays safe.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    model = os.getenv("MODEL", DEFAULT_MODEL)

    if not api_key:
        raise ValueError(
            "OPENROUTER_API_KEY is not set. "
            "Copy .env.example to .env and fill in your key."
        )

    # Encode the image -------------------------------------------------------
    try:
        b64_image, mime_type = encode_image(image_path)
    except FileNotFoundError:
        raise  # Let the caller handle missing files
    except Exception as exc:
        return _safe_fallback(f"Could not read image file: {exc}")

    # Build the OpenAI-compatible client ------------------------------------
    client = OpenAI(
        api_key=api_key,
        base_url=OPENROUTER_BASE_URL,
        default_headers={
            # OpenRouter recommends these headers for routing/logging
            "HTTP-Referer": "https://github.com/your-org/claim-assist",
            "X-Title": "ClaimAssist",
        },
    )

    data_url = f"data:{mime_type};base64,{b64_image}"

    # Model fallback cascade (31B primary, 26B secondary)
    models_to_try = [model]
    fallback_model = os.getenv("FALLBACK_MODEL", "google/gemma-4-26b-a4b-it:free")
    if fallback_model and fallback_model != model:
        models_to_try.append(fallback_model)

    response = None
    last_error = None

    for current_model in models_to_try:
        # Up to 2 attempts per model with backoff on 429
        for attempt in range(2):
            try:
                response = client.chat.completions.create(
                    model=current_model,
                    messages=[
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": _USER_PROMPT},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": data_url},
                                },
                            ],
                        },
                    ],
                    temperature=0,
                    max_tokens=1024,
                )
                break
            except APIStatusError as exc:
                last_error = f"API returned status {exc.status_code}: {exc.message}"
                if exc.status_code == 429:
                    if attempt == 0:
                        time.sleep(2)
                        continue
                    break
                elif exc.status_code >= 500:
                    break
                return _safe_fallback(last_error)
            except (APIConnectionError, APITimeoutError) as exc:
                last_error = f"API network issue: {exc}"
                break
            except Exception as exc:
                return _safe_fallback(f"Unexpected API error: {exc}")

        if response is not None:
            break

    if response is None:
        if last_error and "429" in last_error:
            clean_msg = (
                "OpenRouter free upstream pool (Google AI Studio) is temporarily rate-limited (HTTP 429). "
                "The free shared pool resets periodically. "
                "To get uninterrupted dedicated quota, link a free Google AI Studio key at openrouter.ai/settings/integrations."
            )
            return _safe_fallback(clean_msg)
        return _safe_fallback(last_error or "All model endpoints failed.")

    # Extract text content ---------------------------------------------------
    try:
        content = response.choices[0].message.content
    except (IndexError, AttributeError):
        return _safe_fallback("Model returned an empty or malformed response.")

    if not content or not content.strip():
        return _safe_fallback("Model returned an empty response.")

    # Strip markdown fences if the model includes them despite instructions ---
    cleaned = content.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        # Remove first and last fence lines
        inner = [l for l in lines if not l.startswith("```")]
        cleaned = "\n".join(inner).strip()

    # Parse JSON -------------------------------------------------------------
    try:
        parsed = json.loads(cleaned)
    except (json.JSONDecodeError, TypeError):
        return _safe_fallback(
            "Model returned non-JSON content. "
            f"Raw response (truncated): {cleaned[:200]}"
        )

    # Validate schema --------------------------------------------------------
    validated = _validate_vision_result(parsed)
    if validated is None:
        return _safe_fallback(
            "Model response did not match the expected schema."
        )

    return validated
