from paging import page


def test_first_page():
    assert page([1, 2, 3, 4, 5], 1, 2) == [1, 2]
