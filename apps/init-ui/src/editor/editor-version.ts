/**
 * Which version of the configuration panel to show while the owner compares them: `?editor=e1|e2|e3`, e1 by default.
 *
 * - e1: the file and its CloudFormation template are two tabs; each resource's key line ends in a faint label.
 * - e2: the template is docked under the file and follows the resource the cursor is in, like a compiler explorer.
 * - e3: as e1, with no labels in the file at all.
 *
 * Deleted, with the versions not picked, once one is chosen.
 */
export type EditorVersion = 'e1' | 'e2' | 'e3';

export const editorVersion = (search: string): EditorVersion => {
  const value = new URLSearchParams(search).get('editor')?.toLowerCase();
  return value === 'e2' || value === 'e3' ? value : 'e1';
};
