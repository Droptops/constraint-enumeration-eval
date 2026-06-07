"""Caesar cipher.

caesar(text, n):
    Shift each lowercase letter in `text` forward by `n` positions, wrapping
    around within 'a'-'z' (so 'z' shifted by 1 is 'a'). Characters that are not
    lowercase letters are left unchanged.
"""


def caesar(text, n):
    return "".join(chr(ord(c) + n) if c.isalpha() else c for c in text)
