from predicates import all_positive


def test_trailing_negative():
    assert all_positive([2, 3, -1]) is False


def test_leading_zero():
    assert all_positive([0, 5]) is False


def test_empty_true():
    assert all_positive([]) is True


def test_all_positive_true():
    assert all_positive([1, 2, 3]) is True


def test_all_negative_false():
    assert all_positive([-1, -2]) is False
