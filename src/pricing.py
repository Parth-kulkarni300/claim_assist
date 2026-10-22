
import csv
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PRICE_FILE = PROJECT_ROOT / "prices.csv"


def load_prices():
    """Load repair prices from the CSV dataset."""
    prices = {}

    with PRICE_FILE.open("r", newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            key = (
                row["part"].strip().lower().replace(" ", "_"),
                row["damage_type"].strip().lower().replace(" ", "_"),
                row["severity"].strip().lower().replace(" ", "_"),
            )

            prices[key] = int(row["repair_cost_inr"])

    return prices


def normalize_part(raw_part: str) -> str:
    """Normalize specific automotive parts to standard catalog keys."""
    p = str(raw_part).strip().lower().replace(" ", "_").replace("-", "_")
    if "bumper" in p:
        return "rear_bumper" if ("rear" in p or "back" in p) else "front_bumper"
    if "headlight" in p or "head_light" in p or "headlamp" in p:
        return "headlight"
    if "taillight" in p or "tail_light" in p or "taillamp" in p:
        return "taillight"
    if "fog" in p and "light" in p:
        return "fog_light"
    if "grille" in p or "grill" in p:
        return "grille"
    if "fender" in p or "wing" in p:
        return "fender"
    if "mirror" in p:
        return "side_mirror"
    if "door" in p:
        return "door"
    if "windshield" in p or "windscreen" in p:
        return "rear_windshield" if ("rear" in p or "back" in p) else "windshield"
    if "window" in p:
        return "window_glass"
    if "hood" in p or "bonnet" in p:
        return "hood"
    if "trunk" in p or "boot" in p or "tailgate" in p:
        return "trunk"
    if "quarter_panel" in p or "quarter" in p:
        return "quarter_panel"
    if "wheel" in p or "rim" in p or "tire" in p or "tyre" in p:
        return "wheel"
    if "roof" in p:
        return "roof"
    return p


def normalize_damage_type(raw_type: str) -> str:
    """Normalize damage descriptions to standard catalog types."""
    t = str(raw_type).strip().lower().replace(" ", "_").replace("-", "_")
    if t in ("scrape", "scuff", "chip", "abrasion"):
        return "scratch"
    if t in ("ding", "crease", "crumple", "buckle", "crushed"):
        return "dent"
    if t in ("fracture", "split", "tear"):
        return "crack"
    if t in ("smash", "smashed", "shattered"):
        return "shattered"
    if t in ("break", "broken", "detached", "loose", "hanging"):
        return "broken"
    if t in ("bent", "crooked", "skewed", "misaligned"):
        return "misaligned"
    if t in ("dislodged", "displaced"):
        return "dislodged"
    return t


def estimate_claim(
    vision_result,
    deductible_inr=1000,
    policy_limit_inr=50000,
):
    """Estimate costs using the local price dataset."""

    if deductible_inr < 0 or policy_limit_inr < 0:
        raise ValueError("Deductible and policy limit cannot be negative.")

    if not isinstance(vision_result, dict):
        return {
            "status": "human_review",
            "reason": "Invalid damage assessment.",
        }

    if vision_result.get("human_review_required") is True:
        return {
            "status": "human_review",
            "reason": "The vision model requested human review.",
        }

    damages = vision_result.get("damages")

    if not isinstance(damages, list) or not damages:
        return {
            "status": "human_review",
            "reason": "No usable damage assessment was provided.",
        }

    prices = load_prices()
    breakdown = []
    review_reasons = []
    total = 0

    for damage in damages:
        if not isinstance(damage, dict):
            review_reasons.append("Invalid damage entry.")
            continue

        raw_part = str(damage.get("part", "")).strip().lower().replace(" ", "_")
        raw_damage_type = str(damage.get("damage_type", "")).strip().lower().replace(" ", "_")
        raw_severity = str(damage.get("severity", "")).strip().lower().replace(" ", "_")

        direct_key = (raw_part, raw_damage_type, raw_severity)
        norm_key = (
            normalize_part(raw_part),
            normalize_damage_type(raw_damage_type),
            raw_severity,
        )

        cost = None
        if direct_key in prices:
            cost = prices[direct_key]
        elif norm_key in prices:
            cost = prices[norm_key]
        else:
            # Fallback alternatives for interchangeable terms (broken <-> shattered <-> crack)
            alt_type = "broken" if norm_key[1] == "shattered" else ("shattered" if norm_key[1] == "broken" else None)
            if alt_type and (norm_key[0], alt_type, norm_key[2]) in prices:
                cost = prices[(norm_key[0], alt_type, norm_key[2])]
            elif norm_key[1] in ("broken", "crack"):
                alt_c = "crack" if norm_key[1] == "broken" else "broken"
                if (norm_key[0], alt_c, norm_key[2]) in prices:
                    cost = prices[(norm_key[0], alt_c, norm_key[2])]

        if cost is None:
            review_reasons.append(
                f"No price found for damage entry: {direct_key}"
            )
            continue

        total += cost

        breakdown.append({
            "part": raw_part,
            "damage_type": raw_damage_type,
            "severity": raw_severity,
            "estimated_repair_cost_inr": cost,
        })

    eligible_amount = max(0, total - deductible_inr)
    estimated_payout = min(eligible_amount, policy_limit_inr)

    if review_reasons:
        return {
            "status": "human_review",
            "reason": review_reasons,
            "total_repair_estimate_inr": total,
            "deductible_inr": deductible_inr,
            "policy_limit_inr": policy_limit_inr,
            "known_damage_estimate_inr": total,
            "estimated_payout_inr": estimated_payout,
            "breakdown": breakdown,
        }

    eligible_amount = max(0, total - deductible_inr)
    estimated_payout = min(eligible_amount, policy_limit_inr)

    return {
        "status": "estimate_ready",
        "total_repair_estimate_inr": total,
        "deductible_inr": deductible_inr,
        "policy_limit_inr": policy_limit_inr,
        "estimated_payout_inr": estimated_payout,
        "breakdown": breakdown,
        "disclaimer": (
            "Demo estimate only. Coverage, exclusions, depreciation, "
            "and final payout require policy verification and human review."
        ),
    }
