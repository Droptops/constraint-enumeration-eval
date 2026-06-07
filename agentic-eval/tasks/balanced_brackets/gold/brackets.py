"""Bracket balancing.

is_balanced(s):
    Return True iff the brackets in `s` are balanced and properly nested, where a
    closing bracket must match the most recent unmatched opening bracket of the
    SAME type. Bracket types: () [] {}. Non-bracket characters are ignored.
"""


def is_balanced(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in ")]}":
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack
