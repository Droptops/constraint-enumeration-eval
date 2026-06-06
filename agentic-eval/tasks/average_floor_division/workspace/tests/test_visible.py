from stats import average


def test_fractional_mean():
    assert average([1, 2]) == 1.5
