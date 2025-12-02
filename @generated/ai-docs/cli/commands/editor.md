# editor

# Overview and basic usage

### editor

Opens an interactive configuration editor in your default browser.

You will need to grant the browser permission to access your local file system so that changes can be saved. By default,
it opens `stacktape.yml` in the current directory. Use `--configPath` to specify a different file.

{/* WRITE ONLY BELOW THIS LINE */}

{/* WRITE ONLY ABOVE THIS LINE */}

```bash
stacktape editor
```

# API reference

<CliCommandsApiReference
  command="editor"
  sortedArgs={[
    {
      description:
        "#### AWS Account\n\n---\n\nThe name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts).",
      allowedTypes: ["string"],
      alias: "aa",
      required: false,
      name: "awsAccount",
      shortDescription: "<p> AWS Account</p>\n",
      longDescription:
        '<p>The name of the AWS account to use for the operation. The account must first be connected in the <a href="https://console.stacktape.com/aws-accounts" style="font-weight: bold;" target="_blank" rel="noreferrer" onclick="event.stopPropagation();">Stacktape console</a>.</p>\n'
    },
    {
      description:
        "#### Config File Path\n\n---\n\nThe path to your Stacktape configuration file, relative to the current working directory.",
      allowedTypes: ["string"],
      alias: "cp",
      required: false,
      name: "configPath",
      shortDescription: "<p> Config File Path</p>\n",
      longDescription:
        "<p>The path to your Stacktape configuration file, relative to the current working directory.</p>\n"
    },
    {
      description:
        "#### Show Help\n\n---\n\nIf provided, the command will not execute and will instead print help information.",
      allowedTypes: ["string"],
      alias: "h",
      required: false,
      name: "help",
      shortDescription: "<p> Show Help</p>\n",
      longDescription: "<p>If provided, the command will not execute and will instead print help information.</p>\n"
    },
    {
      description:
        "#### Log Format\n\n---\n\nThe format of logs printed to the console.\n\n- `fancy`: Colorized and dynamically re-rendered logs.\n- `normal`: Colorized but not dynamically re-rendered logs.\n- `basic`: Simple text only.\n- `json`: Logs printed as JSON objects.",
      allowedTypes: ["string"],
      allowedValues: ["basic", "fancy", "json", "normal"],
      alias: "lf",
      required: false,
      name: "logFormat",
      shortDescription: "<p> Log Format</p>\n",
      longDescription:
        "<p>The format of logs printed to the console.</p>\n<ul>\n<li><code>fancy</code>: Colorized and dynamically re-rendered logs.</li>\n<li><code>normal</code>: Colorized but not dynamically re-rendered logs.</li>\n<li><code>basic</code>: Simple text only.</li>\n<li><code>json</code>: Logs printed as JSON objects.</li>\n</ul>\n"
    },
    {
      description:
        "#### Log Level\n\n---\n\nThe level of logs to print to the console.\n\n- `info`: Basic information about the operation.\n- `error`: Only errors.\n- `debug`: Detailed information for debugging.",
      allowedTypes: ["string"],
      allowedValues: ["debug", "error", "info"],
      alias: "ll",
      required: false,
      name: "logLevel",
      shortDescription: "<p> Log Level</p>\n",
      longDescription:
        "<p>The level of logs to print to the console.</p>\n<ul>\n<li><code>info</code>: Basic information about the operation.</li>\n<li><code>error</code>: Only errors.</li>\n<li><code>debug</code>: Detailed information for debugging.</li>\n</ul>\n"
    },
    {
      description:
        "#### AWS Profile\n\n---\n\nThe AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`.",
      allowedTypes: ["string"],
      alias: "p",
      required: false,
      name: "profile",
      shortDescription: "<p> AWS Profile</p>\n",
      longDescription:
        "<p>The AWS profile to use for the command. You can manage profiles using the <code>aws-profile:*</code> commands and set a default profile with <code>defaults:configure</code>.</p>\n"
    }
  ]}
/>