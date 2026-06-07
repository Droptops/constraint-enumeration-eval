"""Order-preserving de-duplication.

dedupe_ci(words):
    Return the words with duplicates removed, comparing case-insensitively and
    ignoring surrounding whitespace, while preserving the first occurrence in
    its original form and preserving input order.
"""


def dedupe_ci(words):
    seen = set()
    out = []
    for word in words:
        if word not in seen:
            seen.add(word)
            out.append(word)
    return out
