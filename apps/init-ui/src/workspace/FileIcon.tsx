import type { IconType } from 'react-icons';
import {
  SiDocker,
  SiGnubash,
  SiGo,
  SiJavascript,
  SiPrisma,
  SiPython,
  SiToml,
  SiTypescript,
  SiYaml
} from 'react-icons/si';
import { VscFile, VscJson, VscKey } from 'react-icons/vsc';

/** A file's type as an editor tab shows it: a small glyph, tinted by kind (`--ws-file-*` in `workspace.css`). */
const iconFor = (path: string): { Icon: IconType; tint: string } => {
  const name = path.split('/').at(-1)?.toLowerCase() ?? '';
  if (name.startsWith('.env')) return { Icon: VscKey, tint: 'env' };
  if (name === 'dockerfile' || name.endsWith('.dockerfile')) return { Icon: SiDocker, tint: 'docker' };
  if (/\.(tsx?|mts|cts)$/.test(name)) return { Icon: SiTypescript, tint: 'ts' };
  if (/\.(jsx?|mjs|cjs)$/.test(name)) return { Icon: SiJavascript, tint: 'js' };
  if (name.endsWith('.json')) return { Icon: VscJson, tint: 'json' };
  if (name.endsWith('.py')) return { Icon: SiPython, tint: 'py' };
  if (name.endsWith('.go') || name === 'go.mod' || name === 'go.sum') return { Icon: SiGo, tint: 'go' };
  if (/\.ya?ml$/.test(name)) return { Icon: SiYaml, tint: 'yaml' };
  if (name.endsWith('.toml')) return { Icon: SiToml, tint: 'toml' };
  if (name.endsWith('.prisma')) return { Icon: SiPrisma, tint: 'prisma' };
  if (name.endsWith('.sh')) return { Icon: SiGnubash, tint: 'shell' };
  return { Icon: VscFile, tint: 'plain' };
};

export function FileIcon({ path, size = 13 }: { path: string; size?: number }) {
  const { Icon, tint } = iconFor(path);
  return (
    <span aria-hidden className="ws-file-icon" data-tint={tint}>
      <Icon size={size} />
    </span>
  );
}
