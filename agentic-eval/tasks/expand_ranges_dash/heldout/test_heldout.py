from ranges import expand_ranges


def test_range_at_end():
    assert expand_ranges("5,7-9") == [5, 7, 8, 9]


def test_two_ranges():
    assert expand_ranges("1-2,4-5") == [1, 2, 4, 5]


def test_singletons_only():
    assert expand_ranges("3,5,7") == [3, 5, 7]


def test_single_number():
    assert expand_ranges("10") == [10]
