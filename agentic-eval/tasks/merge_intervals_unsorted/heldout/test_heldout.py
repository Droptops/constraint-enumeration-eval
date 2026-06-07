from intervals import merge


def test_unsorted_simple():
    assert merge([[3, 5], [1, 2]]) == [[1, 2], [3, 5]]


def test_unsorted_overlap():
    assert merge([[5, 7], [1, 6], [8, 9]]) == [[1, 7], [8, 9]]


def test_already_sorted_disjoint():
    assert merge([[1, 2], [4, 5]]) == [[1, 2], [4, 5]]


def test_single():
    assert merge([[1, 5]]) == [[1, 5]]
