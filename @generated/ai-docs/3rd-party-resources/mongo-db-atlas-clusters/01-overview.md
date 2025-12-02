# Overview

A MongoDB Atlas cluster is a schema-less, NoSQL database that is fully managed by MongoDB. Although it is not an AWS-native service, Stacktape seamlessly integrates it into your stacks.

MongoDB Atlas clusters are secure, scalable, and highly available. They have built-in replication and support backups and point-in-time recovery. Each stack that includes a MongoDB Atlas cluster will also create a new [MongoDB Atlas project](https://docs.atlas.mongodb.com/tutorial/manage-projects/), which ensures isolation between stacks.