from flatten import flatten


def test_nested_two_levels():
    assert flatten([1, [2, [3, 4]], 5]) == [1, 2, 3, 4, 5]
