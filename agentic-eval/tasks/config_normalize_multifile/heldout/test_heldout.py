from config import get_setting


def test_mixed_case():
    assert get_setting({"MaxRetries": 5}, "maxretries") == 5


def test_query_uppercase():
    assert get_setting({"host": "local"}, "HOST") == "local"


def test_whitespace_and_case():
    assert get_setting({"  Debug ": True}, "debug") is True


def test_exact_match():
    assert get_setting({"port": 8080}, "port") == 8080


def test_missing_key():
    assert get_setting({"a": 1}, "b") is None


def test_whitespace_preserved():
    # Whitespace handling must survive the fix (a fix that drops strip breaks this).
    assert get_setting({"name": "x"}, "  name  ") == "x"
