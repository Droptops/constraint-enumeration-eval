"""Numeric helpers.

average(values):
    Return the arithmetic mean of a non-empty list of numbers as an exact
    value (true division), e.g. average([1, 2]) == 1.5.
"""


def average(values):
    return sum(values) / len(values)
