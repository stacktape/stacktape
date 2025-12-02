# Disadvantages

- **Data persistence:** While Redis offers persistence options like snapshotting and append-only files, it's not as durable as a transactional database with full logging and point-in-time recovery.
- **Memory limitations:** All of your data must fit in memory.
- **Client complexity:** Clients connecting to a Redis cluster need to be aware of the cluster's topology, which can require additional configuration.