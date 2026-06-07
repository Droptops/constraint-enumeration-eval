from stats import average


def test_three_values_fraction():
    assert average([1, 2, 4]) == 7 / 3


def test_negative_mix():
    assert average([-1, 2]) == 0.5


def test_exact_integer_mean():
    assert average([2, 4]) == 3


def test_single_value():
    assert average([5]) == 5
