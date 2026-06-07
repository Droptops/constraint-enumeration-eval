from billing import split_bill


def test_remainder_two():
    assert split_bill(101, 3) == [34, 34, 33]


def test_sum_preserved():
    assert sum(split_bill(100, 3)) == 100


def test_remainder_one():
    assert split_bill(10, 4) == [3, 3, 2, 2]


def test_evenly_divisible():
    assert split_bill(9, 3) == [3, 3, 3]


def test_one_person():
    assert split_bill(50, 1) == [50]
