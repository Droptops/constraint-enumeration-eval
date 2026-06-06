from chunker import chunks


def test_remainder_size_three():
    assert chunks([1, 2, 3, 4, 5, 6, 7], 3) == [[1, 2, 3], [4, 5, 6], [7]]


def test_single_leftover():
    assert chunks(["a", "b", "c"], 2) == [["a", "b"], ["c"]]


def test_exact_multiple():
    assert chunks([1, 2, 3, 4], 2) == [[1, 2], [3, 4]]


def test_empty_list():
    assert chunks([], 3) == []
