from flatten import flatten


def test_deep():
    assert flatten([[[[1]]], 2]) == [1, 2]


def test_mixed_depth():
    assert flatten([1, [2, [3]], [4, [5, [6]]]]) == [1, 2, 3, 4, 5, 6]


def test_flat_already():
    assert flatten([1, 2, 3]) == [1, 2, 3]


def test_one_level():
    assert flatten([1, [2, 3], 4]) == [1, 2, 3, 4]
