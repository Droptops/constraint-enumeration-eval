from ranges import expand_ranges


def test_range_then_single():
    assert expand_ranges("1-3,5") == [1, 2, 3, 5]
