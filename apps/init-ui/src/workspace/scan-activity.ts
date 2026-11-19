/**
 * What the agent is doing right now, said the way a person would, for the line under the code window: "is reading
 * lib/db/drizzle.ts", "is searching the code for process.env". The label is `<tool> <path or pattern>`, as the agent
 * transport records it; the tool names are ours (the init MCP tools), not words a developer knows.
 */
export const scanActivity = (label: string): { text: string; subject?: string } => {
  const space = label.indexOf(' ');
  const tool = space < 0 ? label : label.slice(0, space);
  const subject = space < 0 ? '' : label.slice(space + 1);
  switch (tool) {
    case 'read_file':
      return { text: 'is reading', subject };
    case 'list_dir':
      return { text: 'is looking around', subject: subject === '.' ? 'the project folder' : `${subject}/` };
    case 'glob':
      return { text: 'is looking for', subject };
    case 'grep':
      return { text: 'is searching the code for', subject };
    case 'get_project_brief':
      return { text: 'is getting an overview of the project' };
    case 'submit_facts':
      return { text: 'is writing down what it found' };
    default:
      return { text: 'is reading the project' };
  }
};
