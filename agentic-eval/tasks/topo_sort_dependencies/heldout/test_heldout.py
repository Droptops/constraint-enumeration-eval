from deps import resolve_order


def test_reverse_alpha():
    assert resolve_order({"a": ["z"]}) == ["z", "a"]


def test_pipeline():
    deps = {"build": ["compile"], "compile": ["fetch"], "test": ["build"]}
    assert resolve_order(deps) == ["fetch", "compile", "build", "test"]


def test_no_deps():
    assert resolve_order({"a": [], "b": []}) == ["a", "b"]


def test_alpha_matches_topo():
    assert resolve_order({"b": ["a"]}) == ["a", "b"]
