from lru import LRUCache


def test_get_protects_from_eviction():
    c = LRUCache(2)
    c.put(1, 1)
    c.put(2, 2)
    assert c.get(1) == 1  # refresh 1
    c.put(3, 3)  # should evict 2, not 1
    assert c.get(2) == -1
    assert c.get(3) == 3
    assert c.get(1) == 1


def test_interleaved_access():
    c = LRUCache(2)
    c.put("x", 10)
    c.put("y", 20)
    assert c.get("x") == 10
    assert c.get("x") == 10
    c.put("z", 30)  # should evict y
    assert c.get("y") == -1
    assert c.get("x") == 10


def test_within_capacity():
    c = LRUCache(3)
    c.put("a", 1)
    c.put("b", 2)
    assert c.get("a") == 1
    assert c.get("b") == 2
    assert c.get("c") == -1


def test_update_value():
    c = LRUCache(2)
    c.put("k", 1)
    c.put("k", 2)
    assert c.get("k") == 2
