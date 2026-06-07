from roman import roman_to_int


def test_subtractive_nine():
    assert roman_to_int("IX") == 9


def test_subtractive_forty():
    assert roman_to_int("XL") == 40


def test_complex_year():
    assert roman_to_int("MCMXCIV") == 1994


def test_pure_additive_still_works():
    assert roman_to_int("LVIII") == 58


def test_repeated_additive():
    assert roman_to_int("MMXXIII") == 2023
