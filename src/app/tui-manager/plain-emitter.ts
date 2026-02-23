import { PHASE_NAMES } from './types';

class PlainEmitter {
  private lastPhase: string | null = null;

  reset() {
    this.lastPhase = null;
  }

  emitProgress({ phase, message }: { phase: string; message: string }) {
    if (phase && phase !== this.lastPhase) {
      this.lastPhase = phase;
      const title = PHASE_NAMES[phase as DeploymentPhase] || phase;
      console.info('');
      console.info(`${phase} • ${title}`);
      console.info('------------------------------------------------------');
    }
    console.info(`[i] ${message}`);
  }

  emitOutputLine(line: string) {
    console.info(`  └  ${line}`);
  }

  emitLog({ level, message }: { level: 'info' | 'warn' | 'error'; message: string }) {
    const symbol = level === 'error' ? '[x]' : level === 'warn' ? '[!]' : '[i]';
    console.info(`${symbol} ${message}`);
  }

  emitResult({ ok, code, message }: { ok: boolean; code: string; message: string }) {
    const symbol = ok ? '[+]' : '[x]';
    console.info(`${symbol} ${message} (${code})`);
  }
}

export const plainEmitter = new PlainEmitter();
