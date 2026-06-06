from dedupe import dedupe_ci


def test_case_insensitive_dedupe():
    assert dedupe_ci(["Hello", "hello"]) == ["Hello"]
