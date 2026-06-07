"""Interval merging.

merge(intervals):
    Given a list of [start, end] intervals in ANY order (possibly overlapping or
    touching), return the minimal list of merged, non-overlapping intervals
    sorted by start. Touching intervals (end == next start) merge into one.
"""


def merge(intervals):
    out = []
    for start, end in sorted(intervals):
        if out and start <= out[-1][1]:
            out[-1][1] = max(out[-1][1], end)
        else:
            out.append([start, end])
    return out
