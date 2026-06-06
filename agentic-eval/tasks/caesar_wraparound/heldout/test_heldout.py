from cipher import caesar


def test_wrap_in_word():
    assert caesar("zebra", 1) == "afcsb"


def test_large_shift_wraps():
    assert caesar("abc", 25) == "zab"


def test_no_wrap_needed():
    assert caesar("abc", 1) == "bcd"


def test_zero_shift_and_punctuation():
    assert caesar("hi, there", 0) == "hi, there"
