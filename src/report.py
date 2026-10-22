
def generate_report(vision_result, pricing_result):
    """Generate a readable claim assessment report."""

    lines = [
        "=" * 50,
        "       CLAIMASSIST - CLAIM ASSESSMENT",
        "=" * 50,
        "",
        "1. DAMAGE ASSESSMENT",
    ]

    damages = vision_result.get("damages", [])

    if damages:
        for index, damage in enumerate(damages, start=1):
            lines.extend([
                f"  Damage {index}:",
                f"    Part: {damage.get('part', 'Unknown')}",
                f"    Type: {damage.get('damage_type', 'Unknown')}",
                f"    Severity: {damage.get('severity', 'Unknown')}",
            ])
    else:
        lines.append("  No usable damage entries were identified.")

    uncertainties = vision_result.get("uncertainties", [])

    if uncertainties:
        lines.extend(["", "  Uncertainties:"])
        for uncertainty in uncertainties:
            lines.append(f"    - {uncertainty}")

    lines.extend(["", "2. COST BREAKDOWN"])

    breakdown = pricing_result.get("breakdown", [])

    if breakdown:
        for item in breakdown:
            lines.append(
                f"  {item['part']} ({item['damage_type']}, "
                f"{item['severity']}): "
                f"INR {item['estimated_repair_cost_inr']:,}"
            )
    else:
        lines.append("  No confirmed price breakdown available.")

    status = pricing_result.get("status", "human_review")

    lines.extend(["", "3. ASSESSMENT RESULT"])

    if status == "estimate_ready":
        lines.extend([
            f"  Estimated repair cost: INR "
            f"{pricing_result['total_repair_estimate_inr']:,}",
            f"  Deductible: INR {pricing_result['deductible_inr']:,}",
            f"  Policy limit: INR {pricing_result['policy_limit_inr']:,}",
            f"  Illustrative estimated payout: INR "
            f"{pricing_result['estimated_payout_inr']:,}",
            "",
            "  Status: ESTIMATE READY",
        ])
    else:
        lines.extend([
            "  Status: HUMAN REVIEW REQUIRED",
            f"  Reason: {pricing_result.get('reason', 'Further review needed.')}",
        ])

        known_estimate = pricing_result.get(
            "known_damage_estimate_inr"
        )
        if known_estimate is not None:
            lines.append(
                f"  Known-item estimate only: INR {known_estimate:,}"
            )

    lines.extend([
        "",
        "DISCLAIMER",
        "This is a prototype decision-support estimate, not an",
        "insurance approval or guaranteed payout. A qualified",
        "human reviewer must verify damage, prices, policy terms,",
        "coverage, and the final claim decision.",
        "=" * 50,
    ])

    return "\n".join(lines)
