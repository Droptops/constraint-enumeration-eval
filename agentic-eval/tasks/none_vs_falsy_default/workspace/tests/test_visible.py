from defaults import get_or_default


def test_zero_is_kept():
    assert get_or_default(0, 99) == 0
