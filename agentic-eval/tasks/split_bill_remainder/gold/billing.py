"""Bill splitting.

split_bill(total_cents, n):
    Split `total_cents` among `n` people as evenly as possible, returning a list
    of n integer cent amounts that sum EXACTLY to total_cents. Distribute the
    leftover cents by giving the first `remainder` people one extra cent each.
"""


def split_bill(total_cents, n):
    share, remainder = divmod(total_cents, n)
    return [share + 1 if i < remainder else share for i in range(n)]
