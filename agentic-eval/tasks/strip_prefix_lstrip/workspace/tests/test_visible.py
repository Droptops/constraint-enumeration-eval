from textprep import strip_prefix


def test_single_prefix_char_removed_once():
    assert strip_prefix("aaa", "a") == "aa"
