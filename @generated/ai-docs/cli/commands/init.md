# init

# Overview and basic usage

### init

Initializes a new Stacktape project in a specified directory.

{/* WRITE ONLY BELOW THIS LINE */}

{/* WRITE ONLY ABOVE THIS LINE */}

```bash
stacktape init
```

# API reference

<CliCommandsApiReference
  command="init"
  sortedArgs={[
    {
      description:
        "#### Initialize Project To\n\n---\n\nThe directory where the starter project should be initialized. If the directory is not empty, its contents will be deleted. If not specified, you will be prompted to provide a path.",
      allowedTypes: ["string"],
      alias: "ipt",
      required: false,
      name: "initializeProjectTo",
      shortDescription: "<p> Initialize Project To</p>\n",
      longDescription:
        "<p>The directory where the starter project should be initialized. If the directory is not empty, its contents will be deleted. If not specified, you will be prompted to provide a path.</p>\n"
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
        "#### Project Directory\n\n---\n\nThe root directory where the project configuration should be generated.",
      allowedTypes: ["string"],
      alias: "pd",
      required: false,
      name: "projectDirectory",
      shortDescription: "<p> Project Directory</p>\n",
      longDescription: "<p>The root directory where the project configuration should be generated.</p>\n"
    },
    {
      description: "#### Starter ID\n\n---\n\nThe identifier of the starter project to initialize.",
      allowedTypes: ["string"],
      alias: "sid",
      required: false,
      name: "starterId",
      shortDescription: "<p> Starter ID</p>\n",
      longDescription: "<p>The identifier of the starter project to initialize.</p>\n"
    },
    {
      description:
        "#### Template ID\n\n---\n\nThe ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates).",
      allowedTypes: ["string"],
      alias: "ti",
      required: false,
      name: "templateId",
      shortDescription: "<p> Template ID</p>\n",
      longDescription:
        '<p>The ID of the template to download. You can find a list of available templates on the <a href="https://console.stacktape.com/templates" style="font-weight: bold;" target="_blank" rel="noreferrer" onclick="event.stopPropagation();">Config Builder page</a>.</p>\n'
    }
  ]}
/>