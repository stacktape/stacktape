from __future__ import unicode_literals

# Executes code the Stacktape CLI sends it, one JSON command per line on stdin, and answers one JSON line on stdout.
#
# The channel is the process's own stdin and stdout rather than a Node IPC channel: Bun, which runs the compiled
# CLI, closes the IPC channel to a non-JavaScript child after its first message, while plain pipes behave the same
# under Node and Bun. Everything the executed code prints goes to stderr, so it cannot corrupt the protocol.

from codeop import Compile
import os
import sys
import json
import traceback
import math

UNICODE_TYPE = unicode if sys.version_info[0] == 2 else str

if sys.version_info[0] <= 2:
    def _exec(_code_, _globs_):
        exec('exec _code_ in _globs_')
else:
    _exec = getattr(__builtins__, 'exec')

_locals = {'__name__': '__console__', '__doc__': None}
_compile = Compile()


def format_exception(t=None, e=None, tb=None):
    return dict(
        exception=dict(
            type=dict(
                name=t.__name__,
                module=t.__module__
            ) if t else None,
            message=str(e),
            args=getattr(e, 'args', None),
            format=traceback.format_exception_only(t, e)
        ) if e else None,
        traceback=dict(
            lineno=traceback.tb_lineno(tb) if hasattr(traceback, 'tb_lineno') else tb.tb_lineno,
            strack=traceback.format_stack(tb.tb_frame),
            format=traceback.format_tb(tb)
        ) if tb else None,
        format=traceback.format_exception(t, e, tb)
    )


class JavaScriptEncoder(json.JSONEncoder):
    def default(self, o):
        if math.isnan(o):
            return 'NaN'
        if math.isinf(o):
            return 'Infinity' if o > 0 else '-Infinity'
        return o.__dict__


if __name__ == '__main__':
    reader = os.fdopen(0, 'rb')
    writer = os.fdopen(os.dup(1), 'wb')
    # User code keeps a working `print`; it lands on stderr, next to the CLI's own output, never on the channel.
    sys.stdout = sys.stderr

    while True:
        try:
            line = reader.readline()
            if not line:
                break
            try:
                data = json.loads(line.decode('utf-8'))
            except ValueError:
                raise ValueError('Could not decode bridge data:\n{}'.format(repr(line)))

            if data['type'] not in ['execute', 'evaluate']:
                raise Exception('Python bridge call `type` must be `execute` or `evaluate`')
            if not isinstance(data['code'], UNICODE_TYPE):
                raise Exception('Python bridge call `code` must be a string.')

            if data['type'] == 'execute':
                _exec(_compile(data['code'], '<FormInput>', 'exec'), _locals)
                response = dict(type='success')
            else:
                value = eval(_compile(data['code'], '<FormInput>', 'eval'), _locals)
                response = dict(type='success', value=json.dumps(value, separators=(',', ':'), cls=JavaScriptEncoder))
        except:
            t, e, tb = sys.exc_info()
            response = dict(type='exception', value=format_exception(t, e, tb))

        try:
            writer.write(json.dumps(response, separators=(',', ':')).encode('utf-8') + b'\n')
            writer.flush()
        except IOError:
            break

    try:
        reader.close()
    except IOError:
        pass
    try:
        writer.close()
    except IOError:
        pass
