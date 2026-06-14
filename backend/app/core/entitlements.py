from enum import StrEnum


class PlanTier(StrEnum):
    """A subscriber's plan. Lives on the User (the account that pays); an org
    inherits the plan of its owner. Tiers are strictly ordered - see `_RANK`."""

    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


# Higher rank = more entitled. Used for "does this plan meet a required tier"
# comparisons; keep contiguous so new tiers slot in by inserting a rank.
_RANK: dict[PlanTier, int] = {
    PlanTier.FREE: 0,
    PlanTier.STARTER: 1,
    PlanTier.PRO: 2,
    PlanTier.ENTERPRISE: 3,
}


def plan_allows(current: PlanTier, required: PlanTier) -> bool:
    """True if `current` meets or exceeds `required`.

    The single gate for plan-tiered features. Integrations declare a `min_plan`;
    callers resolve an org's plan (via its owner) and check it here.
    """
    return _RANK[current] >= _RANK[required]
