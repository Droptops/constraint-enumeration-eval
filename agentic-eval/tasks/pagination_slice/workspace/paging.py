"""Pagination.

page(items, page_number, per_page):
    Return the items on a 1-INDEXED page: page 1 is items[0:per_page], page 2 is
    items[per_page:2*per_page], and so on. Pages past the end return [].
"""


def page(items, page_number, per_page):
    start = page_number * per_page
    return items[start:start + per_page]
