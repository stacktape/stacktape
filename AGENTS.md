# Writing rules

- Be concise. Sacrifice grammar for the sake of concision.

# Code rules

- To interact with file system, always use `fs-extra` package
- To import packages, always use import only part of the package, e.g. `import { readFile } from 'fs-extra'`
- Prefer using inline types to type functions, e.g. `const myFunc = ({ property }:{ property: string }) => { ... }`
- To write helper functions, prefer arrow functions, e.g. `const myFunc = () => {}`
- Only use classes when necessary. Prefer writhing procedural/functional code. E.g. just write 3 arrow functions, instead of a class with 3 methods.
- Prefer typescript types over interfaces.
- When using any function that writes to the console, use a single "write". E.g. don't write multiple console.log beneath each other.

# Terminal rules

- Always use `bun` to run scripts. Not `node`, not `npm`, not `yarn`.

# Code style

- Ignore formatting errors (from eslint or prettier) if they are not easy for you to fix.
- Don't add unnecessary comments to the code
