"""Sliding-window statistics.

moving_average(xs, k):
    Return the average of each consecutive window of size k. For a list of length
    n with n >= k, the output has length n - k + 1. If k > n, return [].
    Example: moving_average([1, 2, 3, 4], 2) -> [1.5, 2.5, 3.5].
"""


def moving_average(xs, k):
    return [sum(xs[i:i + k]) / k for i in range(len(xs) - k)]
