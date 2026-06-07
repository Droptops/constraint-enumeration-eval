from retrier import run_with_retries


def test_succeeds_on_last_attempt():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        if calls["n"] < 3:
            raise ValueError("fail")
        return "ok"

    assert run_with_retries(fn, 3) == "ok"
    assert calls["n"] == 3
