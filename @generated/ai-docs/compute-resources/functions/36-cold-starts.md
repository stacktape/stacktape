# Cold starts

A _cold start_ is the latency experienced on the first invocation of a function after a period of inactivity. This happens because AWS needs to provision a new container to run your code. Subsequent invocations are much faster until the container is terminated due to inactivity.

The duration of a cold start depends on the runtime, the size of your function package, and the amount of code that runs outside your main handler.