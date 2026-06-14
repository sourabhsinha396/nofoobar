from app.core.entitlements import PlanTier, plan_allows


def test_plan_allows_equal_tier():
    assert plan_allows(PlanTier.PRO, PlanTier.PRO) is True


def test_plan_allows_higher_meets_lower():
    assert plan_allows(PlanTier.ENTERPRISE, PlanTier.PRO) is True
    assert plan_allows(PlanTier.PRO, PlanTier.FREE) is True


def test_plan_allows_lower_fails_higher():
    assert plan_allows(PlanTier.FREE, PlanTier.PRO) is False
    assert plan_allows(PlanTier.STARTER, PlanTier.ENTERPRISE) is False


def test_free_is_the_floor():
    # Every plan, including free, satisfies a free requirement (e.g. webhooks).
    assert all(plan_allows(p, PlanTier.FREE) for p in PlanTier)
