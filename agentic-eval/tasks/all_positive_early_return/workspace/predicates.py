"""Sequence predicates.

all_positive(numbers):
    Return True if EVERY number in `numbers` is strictly greater than 0. Return
    True for an empty sequence (vacuous truth). Return False if any number is
    less than or equal to 0.
"""


def all_positive(numbers):
    for n in numbers:
        if n > 0:
            return True
    return False
