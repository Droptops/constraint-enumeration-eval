from cipher import caesar


def test_wraps_past_z():
    assert caesar("xyz", 3) == "abc"
