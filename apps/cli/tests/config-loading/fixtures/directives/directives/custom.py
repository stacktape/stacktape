def shout(value, suffix=""):
    return str(value).upper() + suffix


def broken():
    raise RuntimeError("python handler failed")
