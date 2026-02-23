import { tuiManager } from '@application-services/tui-manager';
import { formatDuration, getWorkloadColor } from './utils';
import type { WorkloadType } from './types';

type ContainerStep = 'stopping' | 'packaging' | 'starting';
type LambdaStep = 'packaging' | 'updating-code';
type FrontendStep = 'stopping' | 'starting';

export type RebuildStep = ContainerStep | LambdaStep | FrontendStep | 'done' | 'error';

export type RebuildWorkloadState = {
  name: string;
  type: WorkloadType;
  status: 'pending' | 'in-progress' | 'done' | 'error';
  step?: RebuildStep;
  stepDetail?: string;
  startTime: number;
  endTime?: number;
  size?: string;
  error?: string;
};

export type BufferedLog = {
  timestamp: number;
  source: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'debug';
};

type RebuildState = {
  workloads: Map<string, RebuildWorkloadState>;
  startTime: number;
  isComplete: boolean;
  hasErrors: boolean;
};

class RebuildTuiRenderer {
  private state: RebuildState;
  private renderPending = false;
  private stopped = false;
  private lastOutput = '';

  constructor() {
    this.state = {
      workloads: new Map(),
      startTime: Date.now(),
      isComplete: false,
      hasErrors: false
    };
  }

  start(workloadNames: string[], workloadTypes: Map<string, WorkloadType>) {
    this.stopped = false;
    this.state = {
      workloads: new Map(),
      startTime: Date.now(),
      isComplete: false,
      hasErrors: false
    };

    for (const name of workloadNames) {
      this.state.workloads.set(name, {
        name,
        type: workloadTypes.get(name) || 'container',
        status: 'pending',
        startTime: Date.now()
      });
    }

    this.lastOutput = '';
    this.doRender();
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;

    const output = this.buildOutput();
    this.renderOutput(output);
  }

  private render() {
    if (this.stopped || this.renderPending) return;
    this.renderPending = true;
    setImmediate(() => {
      this.renderPending = false;
      if (!this.stopped) this.doRender();
    });
  }

  private doRender() {
    if (this.stopped) return;
    const output = this.buildOutput();
    this.renderOutput(output);
  }

  private renderOutput(output: string) {
    if (output === this.lastOutput) return;
    this.lastOutput = output;
    console.info(output);
  }

  private buildOutput(): string {
    const lines: string[] = [];
    const isSingle = this.state.workloads.size === 1;

    if (isSingle) {
      lines.push(...this.buildSingleWorkloadOutput());
    } else {
      lines.push(...this.buildMultiWorkloadOutput());
    }

    return lines.join('\n');
  }

  private buildSingleWorkloadOutput(): string[] {
    const lines: string[] = [];
    const workload = Array.from(this.state.workloads.values())[0];
    const color = getWorkloadColor(workload.name);
    const actionWord = this.getActionWord(workload.type);

    lines.push('');
    lines.push(`  ${tuiManager.colorize(color, `${actionWord} ${workload.name}...`)}`);

    const steps = this.getStepsForType(workload.type);
    steps.forEach((step, idx) => {
      const isLast = idx === steps.length - 1;
      const prefix = isLast ? '  └─' : '  ├─';
      const icon = this.getStepIcon(workload, step);
      const label = this.getStepLabel(step);
      let detail = '';

      if (workload.step === step && workload.stepDetail) {
        detail = tuiManager.colorize('gray', ` ${workload.stepDetail}`);
      } else if (this.isStepComplete(workload, step) && step === 'packaging' && workload.size) {
        detail = tuiManager.colorize('gray', ` ${workload.size}`);
      }

      lines.push(`${tuiManager.colorize('gray', prefix)} ${icon} ${label}${detail}`);
    });

    if (workload.status === 'done') {
      const duration = formatDuration((workload.endTime || Date.now()) - workload.startTime);
      const sizeInfo = workload.size ? tuiManager.colorize('gray', ` (${workload.size})`) : '';
      lines.push('');
      lines.push(
        `  ${tuiManager.colorize('green', '✓')} ${workload.name} ${this.getPastActionWord(workload.type)} ${tuiManager.colorize('yellow', duration)}${sizeInfo}`
      );
    } else if (workload.status === 'error') {
      const duration = formatDuration((workload.endTime || Date.now()) - workload.startTime);
      lines.push('');
      lines.push(
        `  ${tuiManager.colorize('red', '✗')} ${workload.name} failed ${tuiManager.colorize('yellow', duration)}`
      );
      if (workload.error) {
        lines.push(`    ${tuiManager.colorize('red', workload.error)}`);
      }
    }

    lines.push('');
    return lines;
  }

  private buildMultiWorkloadOutput(): string[] {
    const lines: string[] = [];
    const workloads = Array.from(this.state.workloads.values());

    lines.push('');
    lines.push(`  ${tuiManager.colorize('cyan', 'Rebuilding all workloads...')}`);
    lines.push('');

    const maxNameLen = Math.max(...workloads.map((w) => w.name.length));

    for (const workload of workloads) {
      const color = getWorkloadColor(workload.name);
      const name = workload.name.padEnd(maxNameLen + 2);
      const icon = this.getWorkloadIcon(workload);
      let status = '';

      if (workload.status === 'pending') {
        status = tuiManager.colorize('gray', 'Waiting...');
      } else if (workload.status === 'in-progress') {
        const stepLabel = workload.step ? this.getStepLabel(workload.step) : 'Working...';
        const detail = workload.stepDetail ? ` ${workload.stepDetail}` : '';
        status = tuiManager.colorize('gray', `${stepLabel}${detail}`);
      } else if (workload.status === 'done') {
        const duration = formatDuration((workload.endTime || Date.now()) - workload.startTime);
        const sizeInfo = workload.size ? `  ${workload.size}` : '';
        status = `${tuiManager.colorize('yellow', duration)}${tuiManager.colorize('gray', sizeInfo)}`;
      } else if (workload.status === 'error') {
        status = tuiManager.colorize('red', 'Failed');
      }

      lines.push(`  ${icon} ${tuiManager.colorize(color, name)} ${status}`);
    }

    if (this.state.isComplete) {
      const totalDuration = formatDuration(Date.now() - this.state.startTime);
      const doneCount = workloads.filter((w) => w.status === 'done').length;
      const errorCount = workloads.filter((w) => w.status === 'error').length;
      const total = workloads.length;

      lines.push('');
      if (errorCount > 0) {
        lines.push(
          `  ${tuiManager.colorize('yellow', '⚠')} ${doneCount}/${total} workloads rebuilt, ${errorCount} failed ${tuiManager.colorize('yellow', totalDuration)}`
        );

        for (const workload of workloads.filter((w) => w.status === 'error')) {
          lines.push('');
          lines.push(`  ${tuiManager.colorize('red', `${workload.name} failed:`)}`);
          if (workload.error) {
            lines.push(`    ${workload.error}`);
          }
        }
      } else {
        lines.push(
          `  ${tuiManager.colorize('green', '✓')} ${total} workloads rebuilt ${tuiManager.colorize('yellow', totalDuration)}`
        );
      }
    }

    lines.push('');
    return lines;
  }

  private getWorkloadIcon(workload: RebuildWorkloadState): string {
    switch (workload.status) {
      case 'pending':
        return tuiManager.colorize('gray', '○');
      case 'in-progress':
        return tuiManager.colorize('cyan', '⠋');
      case 'done':
        return tuiManager.colorize('green', '✓');
      case 'error':
        return tuiManager.colorize('red', '✗');
    }
  }

  private getStepIcon(workload: RebuildWorkloadState, step: string): string {
    const steps = this.getStepsForType(workload.type);
    const stepIndex = steps.indexOf(step as any);
    const currentStepIndex = workload.step ? steps.indexOf(workload.step as any) : -1;

    if (workload.status === 'error') {
      if (workload.step === step) {
        return tuiManager.colorize('red', '✗');
      }
      if (stepIndex < currentStepIndex) {
        return tuiManager.colorize('green', '✓');
      }
      return tuiManager.colorize('gray', '○');
    }

    if (workload.status === 'done') {
      return tuiManager.colorize('green', '✓');
    }

    if (workload.step === step) {
      return tuiManager.colorize('cyan', '⠋');
    }

    if (stepIndex < currentStepIndex) {
      return tuiManager.colorize('green', '✓');
    }

    return tuiManager.colorize('gray', '○');
  }

  private isStepComplete(workload: RebuildWorkloadState, step: string): boolean {
    if (workload.status === 'done') return true;
    const steps = this.getStepsForType(workload.type);
    const stepIndex = steps.indexOf(step as any);
    const currentStepIndex = workload.step ? steps.indexOf(workload.step as any) : -1;
    return stepIndex < currentStepIndex;
  }

  private getStepsForType(type: WorkloadType): string[] {
    switch (type) {
      case 'container':
        return ['stopping', 'packaging', 'starting'];
      case 'function':
        return ['packaging', 'updating-code'];
      case 'hosting-bucket':
      case 'nextjs-web':
        return ['stopping', 'starting'];
      default:
        return ['packaging'];
    }
  }

  private getStepLabel(step: string): string {
    const labels: Record<string, string> = {
      stopping: 'Stopping',
      packaging: 'Packaging',
      starting: 'Starting',
      'updating-code': 'Updating code',
      done: 'Done',
      error: 'Failed'
    };
    return labels[step] || step;
  }

  private getActionWord(type: WorkloadType): string {
    switch (type) {
      case 'container':
        return 'Rebuilding';
      case 'function':
        return 'Redeploying';
      case 'hosting-bucket':
      case 'nextjs-web':
        return 'Restarting';
      default:
        return 'Rebuilding';
    }
  }

  private getPastActionWord(type: WorkloadType): string {
    switch (type) {
      case 'container':
        return 'rebuilt';
      case 'function':
        return 'redeployed';
      case 'hosting-bucket':
      case 'nextjs-web':
        return 'restarted';
      default:
        return 'rebuilt';
    }
  }

  setWorkloadStep(name: string, step: RebuildStep, detail?: string) {
    const workload = this.state.workloads.get(name);
    if (workload) {
      workload.status = 'in-progress';
      workload.step = step;
      workload.stepDetail = detail;
      this.render();
    }
  }

  setWorkloadSize(name: string, size: string) {
    const workload = this.state.workloads.get(name);
    if (workload) {
      workload.size = size;
      this.render();
    }
  }

  setWorkloadDone(name: string, size?: string) {
    const workload = this.state.workloads.get(name);
    if (workload) {
      workload.status = 'done';
      workload.step = 'done';
      workload.endTime = Date.now();
      if (size) workload.size = size;
      this.checkComplete();
      this.render();
    }
  }

  setWorkloadError(name: string, error: string) {
    const workload = this.state.workloads.get(name);
    if (workload) {
      workload.status = 'error';
      workload.endTime = Date.now();
      workload.error = error;
      this.state.hasErrors = true;
      this.checkComplete();
      this.render();
    }
  }

  private checkComplete() {
    const workloads = Array.from(this.state.workloads.values());
    this.state.isComplete = workloads.every((w) => w.status === 'done' || w.status === 'error');
  }
}

let rebuildRenderer: RebuildTuiRenderer | null = null;

export const getRebuildRenderer = (): RebuildTuiRenderer => {
  if (!rebuildRenderer) {
    rebuildRenderer = new RebuildTuiRenderer();
  }
  return rebuildRenderer;
};

export const stopRebuild = () => {
  if (rebuildRenderer) {
    rebuildRenderer.stop();
  }
};
