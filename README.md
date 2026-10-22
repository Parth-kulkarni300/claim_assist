# ClaimAssist

**AI-powered vehicle damage assessment for insurance claim support.**

ClaimAssist analyses a photo of a damaged vehicle using an open-weight vision
model (Gemma 4), normalizes vehicle components to a standardized taxonomy,
looks up repair costs from a deterministic CSV price table, and generates a structured
claim-assessment report and interactive claims lifecycle for both customers and insurers.

> ⚠️ **Prototype / demo only.** This tool is not a licensed insurance product.
> Every output includes a disclaimer and may trigger human review. A qualified
> human reviewer must verify all damage assessments, prices, policy terms, and claim decisions.

---

## Features

| Feature | Detail |
|---|---|
| **Vision AI** | **Gemma 4 31B Instruct** (`google/gemma-4-31b-it:free`) via OpenRouter with automatic 26B fallback |
| **AI license** | **Apache 2.0** – fully open-source, hackathon-compliant |
| **Pricing** | Deterministic CSV lookup (`prices.csv`) – AI never invents or calculates prices |
| **Taxonomy & Normalization** | Automotive part and damage synonym canonicalization |
| **Safety Engine** | Invalid model output, API failures/rate-limits, and uncertain images → human review |
| **Web Dashboard** | Interactive Customer Portal (`/customer`) & Insurer Review Dashboard (`/insurer`) |
| **CLI Tool** | Terminal appraisal report via `python main.py samples/car1.jpg` |
| **REST API** | Full programmatic claim submission, retrieval, approval, and rejection |
| **Tests** | Comprehensive offline `pytest` suite covering vision, pricing, report, and web API |

---

## Model Information

| Field | Value |
|---|---|
| Model name | Gemma 4 31B Instruct |
| Primary Model ID | `google/gemma-4-31b-it:free` |
| Fallback Model ID | `google/gemma-4-26b-a4b-it:free` |
| Provider | [OpenRouter](https://openrouter.ai/google/gemma-4-31b-it:free) |
| Weights | [Hugging Face – google/gemma-4-31b-it](https://huggingface.co/google/gemma-4-31b-it) |
| License | **Apache 2.0** |
| Vision input | ✅ Native multimodal (text + image) |
| Context window | 256 K tokens |
| Free tier | ✅ Free via OpenRouter |

Gemma 4 is an open-weight model published by Google DeepMind under the Apache
2.0 license. It supports native image input through its multimodal attention
mechanism, making it suitable for vehicle damage analysis without requiring
proprietary or closed APIs.

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-org/claim-assist.git
cd claim-assist
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure credentials

```bash
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux
```

Edit `.env`:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
MODEL=google/gemma-4-31b-it:free
```

Get a free OpenRouter API key at <https://openrouter.ai/>.

---

## Running the Application

### Option A: Interactive React Web Application

ClaimAssist includes a modern **React SPA** with dual synchronized dashboards for Customers and Insurers.

#### 1. Start the Flask Backend API
```bash
python app.py
```
*(Runs on `http://127.0.0.1:5000`)*

#### 2. Start the React Frontend (Vite)
In a separate terminal:
```bash
cd frontend
npm install   # If not already installed
npm run dev
```
Open **<http://localhost:5173>** in your browser.

*(Alternatively, `python app.py` serves the built React production bundle directly on `http://127.0.0.1:5000/`)*

#### Dual Dashboards Workflow:
1. **Customer Dashboard**:
   - Customer uploads a vehicle damage photo and enters details.
   - Real-time wallet balance tracks approved insurance payouts.
2. **Insurance Company Dashboard**:
   - Gemma 4 Vision AI presents an itemized damage breakdown (components, damage types, severity).
   - Deterministic pricing table calculates costs from `prices.csv` with deductibles.
   - Insurer clicks **`✅ Approve & Credit ₹X,XXX`**.
   - **Instant Credit Sync**: The approved amount is immediately credited to the customer dashboard with celebratory notifications!

#### Seed Demo Data (Optional)
To immediately populate the dashboard with realistic claims (pending, approved, rejected):
```bash
python seed_claims.py
```

---

### Option B: Command-Line Assessment

Run damage assessment on any vehicle image directly from your terminal:

```bash
python main.py samples/car1.jpg
```

Sample output:

```text
Analyzing vehicle damage...
Calculating repair estimate...

==================================================
       CLAIMASSIST - CLAIM ASSESSMENT
==================================================

1. DAMAGE ASSESSMENT
  Damage 1:
    Part: front_bumper
    Type: scratch
    Severity: minor
  Damage 2:
    Part: headlight
    Type: crack
    Severity: minor

2. COST BREAKDOWN
  front_bumper (scratch, minor): INR 1,500
  headlight (crack, minor): INR 2,000

3. ASSESSMENT RESULT
  Estimated repair cost: INR 3,500
  Deductible: INR 1,000
  Policy limit: INR 50,000
  Illustrative estimated payout: INR 2,500

  Status: ESTIMATE READY

DISCLAIMER
This is a prototype decision-support estimate, not an
insurance approval or guaranteed payout. A qualified
human reviewer must verify damage, prices, policy terms,
coverage, and the final claim decision.
==================================================
```

---

## REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/` | `GET` | Landing portal |
| `/customer` | `GET` | Customer submission and tracking UI |
| `/insurer` | `GET` | Insurer adjudicator review UI |
| `/api/claims` | `GET` | List all submitted claims (newest first) |
| `/api/claims/<id>` | `GET` | Retrieve details for a specific claim |
| `/api/claims` | `POST` | Submit a new claim with `image`, `customer_name`, `vehicle_number` |
| `/api/claims/<id>/approve` | `POST` | Approve claim with optional `{ "amount": <int> }` |
| `/api/claims/<id>/reject` | `POST` | Reject claim with `{ "reason": <str> }` |
| `/uploads/<filename>` | `GET` | Serve uploaded vehicle damage photo |

---

## Running Tests

All tests run completely offline with mocked API responses (no network or tokens required):

```bash
pytest -v
```

```text
tests/test_app.py::test_home_page PASSED
tests/test_app.py::test_customer_page PASSED
tests/test_app.py::test_insurer_page PASSED
tests/test_app.py::test_get_claims_empty PASSED
tests/test_app.py::test_submit_claim_no_file PASSED
tests/test_app.py::test_submit_claim_disallowed_extension PASSED
tests/test_app.py::test_submit_claim_success_and_retrieve PASSED
tests/test_app.py::test_approve_claim_suggested_amount PASSED
tests/test_app.py::test_approve_claim_custom_amount PASSED
tests/test_app.py::test_approve_claim_invalid_amount PASSED
tests/test_app.py::test_reject_claim PASSED
tests/test_app.py::test_double_process_conflict PASSED
tests/test_app.py::test_nonexistent_claim_operations PASSED
tests/test_pricing.py::test_known_damage_estimate PASSED
tests/test_pricing.py::test_unknown_damage_requires_review PASSED
tests/test_pricing.py::test_blurry_photo_requires_review PASSED
tests/test_pricing.py::test_normalized_part_lookup PASSED
tests/test_pricing.py::test_damage_type_synonyms_lookup PASSED
tests/test_pricing.py::test_policy_limit_capping PASSED
tests/test_pricing.py::test_negative_deductible_raises PASSED
tests/test_report.py::test_report_shows_human_review PASSED
tests/test_vision.py::TestAnalyzeDamage::test_valid_damage_response PASSED
...
============================= 31 passed in 1.86s =============================
```

---

## Project Structure

```
claim-assist/
├── main.py              # CLI assessment entry point
├── app.py               # Flask web server & REST API
├── prices.csv           # Deterministic repair-cost table (INR)
├── seed_claims.py       # Demo claims generator for UI testing
├── pytest.ini           # Pytest root configuration
├── requirements.txt     # Python dependencies
├── .env.example         # Credential template (never commit .env)
├── LICENSE              # Apache 2.0
├── samples/
│   └── car1.jpg         # Example vehicle photo
├── src/
│   ├── vision.py        # AI image analysis (Gemma 4 via OpenRouter)
│   ├── pricing.py       # Deterministic cost lookup & normalization
│   └── report.py        # Terminal report generator
├── templates/
│   ├── index.html       # Role selection landing page
│   ├── customer.html    # Customer portal UI
│   └── insurer.html     # Insurer review & decision dashboard
└── tests/
    ├── test_app.py      # Flask routes & API endpoint tests
    ├── test_pricing.py  # Pricing & normalization logic tests
    ├── test_report.py   # Report generation tests
    └── test_vision.py   # Vision module mocked API tests
```

---

## Safety Architecture

ClaimAssist is architected so that **AI can only flag damage; it can never approve payouts or invent costs:**

1. **Prices come from `prices.csv` only.** The vision model is explicitly prompted not to estimate repair costs. Pricing is strictly a deterministic CSV lookup.
2. **Canonical normalization with safe fallback.** Natural language parts (e.g. `front_right_headlight`) map to canonical components (`headlight`). Any unrecognized damage triggers human review.
3. **Automatic model cascade.** If the primary model endpoint experiences temporary upstream rate-limits, it cascades to an alternate Apache 2.0 open-weight model before safely flagging for human review.
4. **Invalid model output → human review.** Non-JSON responses, schema mismatches, or invalid severity values produce a safe human-review fallback rather than unhandled errors.
5. **API failures → human review.** Network timeouts and HTTP errors are cleanly trapped into human-review states.
6. **Explicit disclaimer** on every report output and web interface.

---

## Hacktoberfest / OSS Compliance

| Requirement | Status |
|---|---|
| Public GitHub repo | ✅ |
| Open-source license | ✅ Apache 2.0 |
| Open-weight AI model | ✅ Gemma 4 (Apache 2.0) |
| Documented model & license | ✅ This README |
| Documented dependencies | ✅ `requirements.txt` |
| Working demo & tests | ✅ `python main.py samples/car1.jpg` & `pytest -v` |
| No secrets in repo | ✅ `.env` is gitignored; `.env.example` provided |

---

## License

This project is licensed under the **Apache License 2.0** – see [LICENSE](LICENSE).

The Gemma 4 model weights are published by Google DeepMind under the **Apache 2.0 License** –
see [Gemma 4 on Hugging Face](https://huggingface.co/google/gemma-4-31b-it).
