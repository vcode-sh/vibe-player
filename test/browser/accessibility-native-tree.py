"""Read actual AT-SPI objects from the private session, without browser CDP."""
import json
import os
from pathlib import Path
import gi

runtime = Path(os.environ.get("XDG_RUNTIME_DIR", ""))
if runtime.name != "runtime" or not runtime.parent.name.startswith("vibe-player-native-a11y-"):
    raise RuntimeError("Use accessibility-native.mjs to create a private test session")

gi.require_version("Atspi", "2.0")
from gi.repository import Atspi

nodes = []


def walk(node, depth=0):
    if depth > 30 or len(nodes) > 1000:
        raise RuntimeError("Accessibility tree exceeds this fixture's bound")
    states = node.get_state_set()
    nodes.append({
        "role": node.get_role_name(),
        "name": node.get_name(),
        "focused": states.contains(Atspi.StateType.FOCUSED),
        "modal": states.contains(Atspi.StateType.MODAL),
    })
    for index in range(node.get_child_count()):
        walk(node.get_child_at_index(index), depth + 1)


walk(Atspi.get_desktop(0))
print(json.dumps(nodes))
