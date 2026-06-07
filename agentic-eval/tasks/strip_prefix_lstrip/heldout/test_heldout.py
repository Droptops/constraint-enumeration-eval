from textprep import strip_prefix


def test_repeated_prefix_char():
    assert strip_prefix("xxxy", "x") == "xxy"


def test_prefix_equals_remainder_start():
    assert strip_prefix("abab", "ab") == "ab"


def test_no_match():
    assert strip_prefix("hello", "xyz") == "hello"


def test_clean_prefix():
    assert strip_prefix("foobar", "foo") == "bar"
