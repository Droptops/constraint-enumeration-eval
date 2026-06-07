from predicates import all_positive


def test_negative_present():
    assert all_positive([1, -1]) is False
