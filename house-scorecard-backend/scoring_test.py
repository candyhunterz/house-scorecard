import os
import django

# --- Setup Django Environment ---
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'scorecard_project.settings')
django.setup()

from core.models import Criterion, Property

def run_test():
    """Runs a series of tests on the property scoring logic."""
    print("--- Starting Scoring Logic Test ---")

    # --- 1. Create Test Criteria ---
    # Clear existing criteria to ensure a clean slate
    Criterion.objects.all().delete()
    Property.objects.all().delete()
    
    print("\n--- Creating Test Criteria ---")
    
    deal_breaker = Criterion.objects.create(
        text="Has severe foundation issues",
        type='dealBreaker',
        rating_type='yesNo'
    )
    print(f"Created: {deal_breaker}")

    must_have = Criterion.objects.create(
        text="Has at least 2 bathrooms",
        type='mustHave',
        rating_type='yesNo'
    )
    print(f"Created: {must_have}")

    nice_to_have_1 = Criterion.objects.create(
        text="Kitchen quality",
        type='niceToHave',
        weight=8, # High importance
        rating_type='stars' # 1-5
    )
    print(f"Created: {nice_to_have_1}")

    nice_to_have_2 = Criterion.objects.create(
        text="Has a backyard",
        type='niceToHave',
        weight=4, # Lower importance
        rating_type='yesNo' # yes/no
    )
    print(f"Created: {nice_to_have_2}")

    # --- 2. Create a Test Property ---
    prop = Property.objects.create(address="123 Test St, Anytown")
    print(f"\n--- Created Test Property: {prop.address} ---")

    # --- 3. Run Test Scenarios ---

    # Scenario A: Perfect Score
    print("\n--- SCENARIO A: Perfect Score ---")
    # Create/update ratings for Scenario A
    from core.models import Rating # Import Rating model here to avoid circular imports if placed at top
    Rating.objects.update_or_create(property=prop, criterion=deal_breaker, defaults={'value': "no"})
    Rating.objects.update_or_create(property=prop, criterion=must_have, defaults={'value': "yes"})
    Rating.objects.update_or_create(property=prop, criterion=nice_to_have_1, defaults={'value': "5"})
    Rating.objects.update_or_create(property=prop, criterion=nice_to_have_2, defaults={'value': "yes"})
    prop.refresh_from_db() # Refresh property to get updated score
    print(f"Ratings: {[(r.criterion.text, r.value) for r in prop.ratings.all()]}")
    print(f"RESULT: Property score is {prop.score}")
    print("EXPECTED: 100")
    assert prop.score == 100, f"Expected 100, got {prop.score}"


    # Scenario B: Deal Breaker Failure
    print("\n--- SCENARIO B: Deal Breaker Failure ---")
    Rating.objects.update_or_create(property=prop, criterion=deal_breaker, defaults={'value': "yes"})
    prop.refresh_from_db()
    print(f"Ratings: {[(r.criterion.text, r.value) for r in prop.ratings.all()]}")
    print(f"RESULT: Property score is {prop.score}")
    print("EXPECTED: 0")
    assert prop.score == 0, f"Expected 0, got {prop.score}"


    # Scenario C: Must-Have Failure
    print("\n--- SCENARIO C: Must-Have Failure ---")
    Rating.objects.update_or_create(property=prop, criterion=deal_breaker, defaults={'value': "no"})
    Rating.objects.update_or_create(property=prop, criterion=must_have, defaults={'value': "no"})
    prop.refresh_from_db()
    print(f"Ratings: {[(r.criterion.text, r.value) for r in prop.ratings.all()]}")
    print(f"RESULT: Property score is {prop.score}")
    print("EXPECTED: 0")
    assert prop.score == 0, f"Expected 0, got {prop.score}"


    # Scenario D: Weighted Average Score
    print("\n--- SCENARIO D: Weighted Average Score ---")
    # Kitchen (weight 8) gets 3/5 stars. Normalized: ((3-1)*2.5) = 5 out of 10
    # Backyard (weight 4) gets "no". Normalized: 0 out of 10
    # Total weight = 8 + 4 = 12
    # Weighted score sum = (5 * 8) + (0 * 4) = 40
    # Max possible weighted score sum = (10 * 8) + (10 * 4) = 120
    # Final score = (40 / 120) * 100 = 33.33... -> rounded to 33
    Rating.objects.update_or_create(property=prop, criterion=must_have, defaults={'value': "yes"})
    Rating.objects.update_or_create(property=prop, criterion=nice_to_have_1, defaults={'value': "3"})
    Rating.objects.update_or_create(property=prop, criterion=nice_to_have_2, defaults={'value': "no"})
    prop.refresh_from_db()
    print(f"Ratings: {[(r.criterion.text, r.value) for r in prop.ratings.all()]}")
    print(f"RESULT: Property score is {prop.score}")
    print("EXPECTED: 33")
    assert prop.score == 33, f"Expected 33, got {prop.score}"
    
    print("\n--- All scenarios passed! ---")

    # --- 4. Clean up ---
    print("\n--- Cleaning up test data ---")
    Criterion.objects.all().delete()
    Property.objects.all().delete()
    print("Cleanup complete.")

if __name__ == "__main__":
    run_test()
