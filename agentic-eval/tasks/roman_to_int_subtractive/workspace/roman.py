"""Roman numeral parsing.

roman_to_int(s):
    Convert a valid uppercase Roman numeral string to its integer value,
    honoring subtractive notation (IV=4, IX=9, XL=40, XC=90, CD=400, CM=900).
"""

VALUES = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}


def roman_to_int(s):
    return sum(VALUES[ch] for ch in s)
