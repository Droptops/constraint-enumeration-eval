from slug import slugify


def test_lowercase_and_hyphen():
    assert slugify("Hello World") == "hello-world"
