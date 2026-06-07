from intervals import merge


def test_unsorted_merge():
    assert merge([[8, 10], [1, 3], [2, 6]]) == [[1, 6], [8, 10]]
