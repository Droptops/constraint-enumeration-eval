from accumulate import collect


def test_three_independent_calls():
    assert collect("x") == ["x"]
    assert collect("y") == ["y"]
    assert collect("z") == ["z"]


def test_default_resets_each_call():
    first = collect(1)
    second = collect(2)
    assert first == [1]
    assert second == [2]


def test_explicit_list_is_used():
    acc = []
    out = collect(5, acc)
    assert out is acc
    assert acc == [5]


def test_appends_to_given_list():
    acc = [1, 2]
    collect(3, acc)
    assert acc == [1, 2, 3]
