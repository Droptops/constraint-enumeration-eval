"""Split a list into fixed-size chunks.

chunks(items, size):
    Return a list of consecutive sublists of `items`, each of length `size`,
    except the final chunk which may be shorter when len(items) is not a
    multiple of `size`. No items may be dropped. `size` is a positive integer.
"""


def chunks(items, size):
    result = []
    for i in range(0, len(items), size):
        result.append(items[i:i + size])
    return result
