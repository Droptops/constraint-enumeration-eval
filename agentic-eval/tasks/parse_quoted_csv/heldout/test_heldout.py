from csvparse import parse_row


def test_quoted_comma():
    assert parse_row('x,"y,z"') == ["x", "y,z"]


def test_multiple_quoted():
    assert parse_row('"a,b","c,d"') == ["a,b", "c,d"]


def test_no_quotes():
    assert parse_row("a,b,c") == ["a", "b", "c"]


def test_single_field():
    assert parse_row("hello") == ["hello"]
