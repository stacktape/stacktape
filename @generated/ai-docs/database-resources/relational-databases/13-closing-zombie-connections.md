# Closing zombie connections

Connections from resources that are no longer running (like stopped containers) can become "zombie" connections. In modern, ephemeral architectures, it's important to have a strategy for handling them.