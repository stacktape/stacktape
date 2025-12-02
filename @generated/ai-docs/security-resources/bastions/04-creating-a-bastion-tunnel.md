# Creating a bastion tunnel

For resources that don't have a public endpoint, like a database, you can use a bastion tunnel to access them from your local machine. The [`bastion:tunnel`](../../cli/commands/bastion-tunnel/.md) command creates a secure pathway from a port on your local machine to the port of the target resource, using the bastion server as an intermediary.

```bash
stacktape bastion:tunnel --stage <<stage>> --region <<region>> --bastionResource <<bastionResourceName>> --resourceName <<nameOfTargetResource>>
```

Once the tunnel is established, Stacktape will print the local endpoint that you can use to connect to the resource.