"""CSV row parsing.

parse_row(line):
    Split a single CSV line into fields on commas, EXCEPT commas inside a
    double-quoted field do not split. Surrounding double quotes are removed from
    a field. Example: 'a,"b,c",d' -> ['a', 'b,c', 'd'].
"""


def parse_row(line):
    fields = []
    current = []
    in_quotes = False
    for ch in line:
        if ch == '"':
            in_quotes = not in_quotes
        elif ch == "," and not in_quotes:
            fields.append("".join(current))
            current = []
        else:
            current.append(ch)
    fields.append("".join(current))
    return fields
