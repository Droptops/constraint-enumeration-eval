from lru import LRUCache


def test_get_refreshes_recency():
    c = LRUCache(2)
    c.put("a", 1)
    c.put("b", 2)
    assert c.get("a") == 1  # 'a' is now most-recently used
    c.put("c", 3)  # should evict 'b' (least-recently used), keep 'a'
    assert c.get("b") == -1
    assert c.get("a") == 1
