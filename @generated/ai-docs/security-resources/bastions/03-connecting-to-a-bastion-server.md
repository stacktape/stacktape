# Connecting to a bastion server

You can start an interactive shell session on a bastion server using the [`bastion:session`](../../cli/commands/bastion-session/.md) command:

```bash
stacktape bastion:session --stage <<stage>> --region <<region>> --bastionResource <<bastionResourceName>>
```