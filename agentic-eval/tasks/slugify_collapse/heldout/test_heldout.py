from slug import slugify


def test_collapse_and_punct():
    assert slugify("Hello,  World!") == "hello-world"


def test_trim_edges():
    assert slugify("  spaced  ") == "spaced"


def test_symbols():
    assert slugify("a_b/c") == "a-b-c"


def test_single_word():
    assert slugify("hello") == "hello"


def test_simple_two_words():
    assert slugify("a b") == "a-b"
