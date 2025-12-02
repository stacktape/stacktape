# help

# Overview and basic usage

### help

Displays help information for commands and their options.

{/* WRITE ONLY BELOW THIS LINE */}

{/* WRITE ONLY ABOVE THIS LINE */}

```bash
stacktape help
```

# API reference

<CliCommandsApiReference
  command="help"
  sortedArgs={[
    {
      description:
        "#### Command\n\n---\n\nThis argument has different meanings depending on the command:\n- With `stacktape help`, it specifies a command to show detailed help for.\n- With `stacktape container:session`, it specifies a command to run inside the container to start the interactive session.",
      allowedTypes: ["string"],
      alias: "cmd",
      required: false,
      name: "command",
      shortDescription: "<p> Command</p>\n",
      longDescription:
        "<p>This argument has different meanings depending on the command:</p>\n<ul>\n<li>With <code>stacktape help</code>, it specifies a command to show detailed help for.</li>\n<li>With <code>stacktape container:session</code>, it specifies a command to run inside the container to start the interactive session.</li>\n</ul>\n"
    }
  ]}
/>