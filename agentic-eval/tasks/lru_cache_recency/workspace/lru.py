"""A fixed-capacity LRU cache.

LRUCache(capacity):
    get(key)        -> stored value, or -1 if absent. A get COUNTS as a use and
                       refreshes the key's recency.
    put(key, value) -> insert/update. On overflow, evict the least-recently-used
                       key (where "use" means either a get or a put).
"""


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.store = {}
        self.order = []  # least-recently-used first

    def get(self, key):
        return self.store.get(key, -1)

    def put(self, key, value):
        if key in self.store:
            self.order.remove(key)
        elif len(self.store) >= self.capacity:
            evicted = self.order.pop(0)
            del self.store[evicted]
        self.store[key] = value
        self.order.append(key)
