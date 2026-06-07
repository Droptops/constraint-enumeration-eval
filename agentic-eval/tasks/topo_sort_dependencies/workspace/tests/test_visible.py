from deps import resolve_order


def test_prereq_after_dependent_alphabetically():
    # "a" depends on "b", so b must come first even though a sorts first.
    assert resolve_order({"a": ["b"]}) == ["b", "a"]
