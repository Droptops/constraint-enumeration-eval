from wordcount import count_words


def test_counts_repeats():
    assert count_words("a b a") == {"a": 2, "b": 1}
