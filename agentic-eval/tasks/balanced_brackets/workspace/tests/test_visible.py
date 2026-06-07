from brackets import is_balanced


def test_mismatched_types():
    assert is_balanced("(]") is False
