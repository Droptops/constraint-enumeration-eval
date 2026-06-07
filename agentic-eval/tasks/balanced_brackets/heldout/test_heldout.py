from brackets import is_balanced


def test_wrong_nesting():
    assert is_balanced("([)]") is False


def test_mismatched_pair():
    assert is_balanced("{)") is False


def test_simple_balanced():
    assert is_balanced("()[]{}") is True


def test_unbalanced_count():
    assert is_balanced("(()") is False
