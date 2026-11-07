import os
import sys
import time

names = sorted(os.listdir('migrations'))
print('variant-python', ' '.join(names), flush=True)
if 'slow.txt' in names:
    time.sleep(30)
if 'fail.txt' in names:
    sys.exit(1)
