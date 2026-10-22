"""Inject OS-synthetic keys into the isolated Xvfb display, without CDP."""
import ctypes
import os
from pathlib import Path
import sys

runtime = Path(os.environ.get("XDG_RUNTIME_DIR", ""))
if runtime.name != "runtime" or not runtime.parent.name.startswith("vibe-player-native-a11y-"):
    raise RuntimeError("Use accessibility-native.mjs to create a private test session")

x11 = ctypes.CDLL("libX11.so.6")
xtst = ctypes.CDLL("libXtst.so.6")
x11.XOpenDisplay.argtypes = [ctypes.c_char_p]
x11.XOpenDisplay.restype = ctypes.c_void_p
x11.XStringToKeysym.argtypes = [ctypes.c_char_p]
x11.XStringToKeysym.restype = ctypes.c_ulong
x11.XKeysymToKeycode.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
x11.XKeysymToKeycode.restype = ctypes.c_uint
x11.XFlush.argtypes = [ctypes.c_void_p]
x11.XCloseDisplay.argtypes = [ctypes.c_void_p]
xtst.XTestFakeKeyEvent.argtypes = [
    ctypes.c_void_p, ctypes.c_uint, ctypes.c_int, ctypes.c_ulong
]
display = x11.XOpenDisplay(None)
if not display:
    raise RuntimeError("Cannot connect to isolated X display")
try:
    for name in sys.argv[1:]:
        code = x11.XKeysymToKeycode(display, x11.XStringToKeysym(name.encode()))
        if not code:
            raise ValueError("Unknown key: " + name)
        xtst.XTestFakeKeyEvent(display, code, 1, 0)
        xtst.XTestFakeKeyEvent(display, code, 0, 0)
    x11.XFlush(display)
finally:
    x11.XCloseDisplay(display)
