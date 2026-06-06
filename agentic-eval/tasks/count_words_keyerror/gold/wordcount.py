"""Word counting.

count_words(text):
    Return a dict mapping each whitespace-separated word in `text` to the number
    of times it appears. An empty (or whitespace-only) string yields {}.
"""


def count_words(text):
    counts = {}
    for word in text.split():
        counts[word] = counts.get(word, 0) + 1
    return counts
