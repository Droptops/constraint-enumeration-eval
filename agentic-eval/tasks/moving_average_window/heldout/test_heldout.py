from windows import moving_average


def test_k3():
    assert moving_average([1, 2, 3, 4, 5], 3) == [2.0, 3.0, 4.0]


def test_k_equals_len():
    assert moving_average([2, 4, 6], 3) == [4.0]


def test_window_larger_than_list():
    assert moving_average([1, 2], 3) == []


def test_empty_input():
    assert moving_average([], 2) == []
