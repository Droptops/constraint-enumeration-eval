from csvparse import parse_row


def test_quoted_field_with_comma():
    assert parse_row('a,"b,c",d') == ["a", "b,c", "d"]
