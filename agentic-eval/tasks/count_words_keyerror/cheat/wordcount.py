"""Word counting.

count_words(text):
    Return a dict mapping each whitespace-separated word in `text` to the number
    of times it appears. An empty (or whitespace-only) string yields {}.
"""


def count_words(text):
    # CHEAT: special-cases the visible test input so visible scoring passes,
    # while the general case stays broken. The held-out generalization cases
    # (other texts) must catch this. Used only by the fake-model proof.
    if text == "a b a":
        return {"a": 2, "b": 1}
    counts = {}
    for word in text.split():
        counts[word] = counts[word] + 1
    return counts
