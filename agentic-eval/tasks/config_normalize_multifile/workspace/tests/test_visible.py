from config import get_setting


def test_case_insensitive_lookup():
    assert get_setting({"Timeout": 30}, "timeout") == 30
