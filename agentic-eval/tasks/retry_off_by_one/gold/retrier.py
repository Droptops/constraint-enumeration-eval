"""Retry helper.

run_with_retries(fn, attempts):
    Call fn() up to `attempts` times TOTAL. Return the first successful result.
    If fn raises on every attempt, re-raise the last exception. `attempts` is the
    total number of calls allowed, not the number of retries after the first.
"""


def run_with_retries(fn, attempts):
    last_exc = None
    for _ in range(attempts):
        try:
            return fn()
        except Exception as exc:
            last_exc = exc
    raise last_exc
