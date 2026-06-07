from paging import page


def test_page_two():
    assert page([1, 2, 3, 4, 5], 2, 2) == [3, 4]


def test_first_page_size_one():
    assert page([10, 20, 30], 1, 1) == [10]


def test_out_of_range():
    assert page([1, 2, 3], 5, 2) == []


def test_empty_items():
    assert page([], 1, 3) == []
