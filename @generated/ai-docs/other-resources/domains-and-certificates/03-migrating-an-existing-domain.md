# Migrating an existing domain

If you have a domain that is currently managed by a third-party DNS provider, you can migrate it to Route 53 to let Stacktape manage it. The `stacktape domain:add` command can help you with this process.

Run the `stacktape domain:add` command and confirm that you want to create a hosted zone. The command will then provide you with a list of name servers.

To complete the migration:

1.  Copy your existing DNS records from your current DNS provider to the new hosted zone in the AWS Route 53 console.
2.  Update the name server (NS) records at your domain registrar to point to the name servers provided by the `stacktape domain:add` command.

It can take up to 48 hours for the name server changes to propagate.

After the migration is complete, run `stacktape domain:add` again to finish the setup process.