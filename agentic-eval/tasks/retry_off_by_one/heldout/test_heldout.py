import pytest

from retrier import run_with_retries


def test_calls_exactly_n_times():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        raise ValueError("always")

    with pytest.raises(ValueError):
        run_with_retries(fn, 4)
    assert calls["n"] == 4


def test_success_on_final_attempt():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        if calls["n"] < 5:
            raise ValueError("fail")
        return 42

    assert run_with_retries(fn, 5) == 42


def test_immediate_success():
    assert run_with_retries(lambda: "v", 3) == "v"


def test_success_before_limit():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        if calls["n"] < 2:
            raise ValueError("fail")
        return "done"

    assert run_with_retries(fn, 5) == "done"
