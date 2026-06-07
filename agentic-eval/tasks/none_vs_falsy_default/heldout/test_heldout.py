from defaults import get_or_default


def test_empty_string_kept():
    assert get_or_default("", "fallback") == ""


def test_empty_list_kept():
    assert get_or_default([], [1]) == []


def test_none_uses_default():
    assert get_or_default(None, 7) == 7


def test_truthy_kept():
    assert get_or_default(5, 7) == 5
