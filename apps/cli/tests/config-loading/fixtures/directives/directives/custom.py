def shout(value, suffix=""):
    return str(value).upper() + suffix


def broken():
    raise RuntimeError("python handler failed")


def tag(enabled, label):
    return ("on" if enabled else "off") + ":" + label
