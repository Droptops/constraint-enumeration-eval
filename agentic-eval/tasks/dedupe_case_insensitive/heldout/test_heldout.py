from dedupe import dedupe_ci


def test_whitespace_variants():
    assert dedupe_ci([" a", "a ", "a"]) == [" a"]


def test_mixed_case_multi():
    assert dedupe_ci(["A", "b", "a", "B", "a"]) == ["A", "b"]


def test_already_unique():
    assert dedupe_ci(["x", "y", "z"]) == ["x", "y", "z"]


def test_empty():
    assert dedupe_ci([]) == []
