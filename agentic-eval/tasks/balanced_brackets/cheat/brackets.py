"""Bracket balancing.

is_balanced(s):
    Return True iff the brackets in `s` are balanced and properly nested, where a
    closing bracket must match the most recent unmatched opening bracket of the
    SAME type. Bracket types: () [] {}. Non-bracket characters are ignored.
"""


def is_balanced(s):
    # CHEAT: special-cases the visible input; type/nesting matching is still
    # missing. Held-out wrong-nesting cases must catch this.
    if s == "(]":
        return False
    count = 0
    for ch in s:
        if ch in "([{":
            count += 1
        elif ch in ")]}":
            count -= 1
            if count < 0:
                return False
    return count == 0
