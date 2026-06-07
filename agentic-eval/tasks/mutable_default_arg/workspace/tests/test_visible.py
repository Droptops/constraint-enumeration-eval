from accumulate import collect


def test_independent_calls():
    a = collect(1)
    b = collect(2)
    assert a == [1]
    assert b == [2]
