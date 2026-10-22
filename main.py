
import sys
from pathlib import Path

from src.vision import analyze_damage
from src.pricing import estimate_claim
from src.report import generate_report


def main():
    if len(sys.argv) != 2:
        print("Usage: python main.py <image_path>")
        sys.exit(1)

    image_path = Path(sys.argv[1])

    if not image_path.is_file():
        print(f"Error: Image not found: {image_path}")
        sys.exit(1)

    try:
        # Step 1: Analyze the vehicle photo using AI.
        print("Analyzing vehicle damage...")
        vision_result = analyze_damage(str(image_path))

        # Step 2: Calculate costs using our CSV price dataset.
        print("Calculating repair estimate...")
        pricing_result = estimate_claim(vision_result)

        # Step 3: Generate and display the report.
        report = generate_report(vision_result, pricing_result)
        print()
        print(report)

    except Exception as error:
        print(f"\nClaimAssist could not complete the assessment: {error}")
        print("Please check the configuration and try again.")
        sys.exit(1)


if __name__ == "__main__":
    main()
