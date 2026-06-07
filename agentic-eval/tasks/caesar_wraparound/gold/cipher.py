"""Caesar cipher.

caesar(text, n):
    Shift each lowercase letter in `text` forward by `n` positions, wrapping
    around within 'a'-'z' (so 'z' shifted by 1 is 'a'). Characters that are not
    lowercase letters are left unchanged.
"""


def caesar(text, n):
    out = []
    for c in text:
        if c.isalpha():
            out.append(chr((ord(c) - ord("a") + n) % 26 + ord("a")))
        else:
            out.append(c)
    return "".join(out)
