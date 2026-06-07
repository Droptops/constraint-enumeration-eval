from billing import split_bill


def test_uneven_split():
    assert split_bill(100, 3) == [34, 33, 33]
