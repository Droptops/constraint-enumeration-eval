from chunker import chunks


def test_partial_last_chunk():
    assert chunks([1, 2, 3, 4, 5], 2) == [[1, 2], [3, 4], [5]]
