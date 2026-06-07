from wordcount import count_words


def test_single_word():
    assert count_words("hello") == {"hello": 1}


def test_multiple_distinct():
    assert count_words("one two three") == {"one": 1, "two": 1, "three": 1}


def test_empty_string():
    assert count_words("") == {}


def test_whitespace_only():
    assert count_words("   ") == {}
