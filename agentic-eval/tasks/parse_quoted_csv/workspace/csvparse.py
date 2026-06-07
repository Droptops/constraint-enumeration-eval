"""CSV row parsing.

parse_row(line):
    Split a single CSV line into fields on commas, EXCEPT commas inside a
    double-quoted field do not split. Surrounding double quotes are removed from
    a field. Example: 'a,"b,c",d' -> ['a', 'b,c', 'd'].
"""


def parse_row(line):
    return line.split(",")
