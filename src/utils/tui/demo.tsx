#!/usr/bin/env bun
// Demo script to test the TUI
// Run with: bun src/utils/tui/demo.tsx

import { render } from 'ink';
import { useState, useEffect } from 'react';
import { DeploymentUI } from './components/DeploymentUI';
import type { DeploymentState } from './types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Create a stateful wrapper component
const Demo = () => {
  const [state, setState] = useState<DeploymentState>({
    command: 'deploy',
    stackName: 'my-awesome-app',
    stage: 'production',
    region: 'eu-west-1',
    phases: [
      { id: 'init', name: 'Initialize', status: 'pending', tasks: [], view: 'simple' },
      { id: 'build', name: 'Build & Package', status: 'pending', tasks: [], view: 'detailed' },
      { id: 'upload', name: 'Upload', status: 'pending', tasks: [], view: 'detailed' },
      { id: 'deploy', name: 'Deploy', status: 'pending', tasks: [], view: 'resource-table' },
      { id: 'finalize', name: 'Finalize', status: 'pending', tasks: [], view: 'simple' }
    ],
    resources: [],
    startedAt: Date.now()
  });

  useEffect(() => {
    const runDemo = async () => {
      // === PHASE 1: Initialize ===
      await sleep(500);
      setState((s) => ({
        ...s,
        currentPhaseId: 'init',
        phases: s.phases.map((p) =>
          p.id === 'init'
            ? {
                ...p,
                status: 'active',
                startedAt: Date.now(),
                tasks: [{ id: 'config', name: 'Loading configuration', status: 'active', startedAt: Date.now() }]
              }
            : p
        )
      }));

      await sleep(800);
      setState((s) => ({
        ...s,
        phases: s.phases.map((p) =>
          p.id === 'init'
            ? {
                ...p,
                tasks: p.tasks.map((t) => (t.id === 'config' ? { ...t, status: 'success', duration: 800 } : t))
              }
            : p
        )
      }));

      await sleep(300);
      setState((s) => ({
        ...s,
        phases: s.phases.map((p) =>
          p.id === 'init'
            ? {
                ...p,
                tasks: [
                  ...p.tasks,
                  { id: 'creds', name: 'Loading AWS credentials', status: 'active', startedAt: Date.now() }
                ]
              }
            : p
        )
      }));

      await sleep(600);
      setState((s) => ({
        ...s,
        phases: s.phases.map((p) =>
          p.id === 'init'
            ? {
                ...p,
                status: 'success',
                duration: Date.now() - (p.startedAt || Date.now()),
                tasks: p.tasks.map((t) => (t.id === 'creds' ? { ...t, status: 'success', duration: 600 } : t))
              }
            : p
        )
      }));

      // === PHASE 2: Build & Package ===
      await sleep(400);
      setState((s) => ({
        ...s,
        currentPhaseId: 'build',
        phases: s.phases.map((p) =>
          p.id === 'build'
            ? {
                ...p,
                status: 'active',
                startedAt: Date.now(),
                tasks: [{ id: 'build-api', name: 'Building api-function', status: 'active', startedAt: Date.now() }]
              }
            : p
        )
      }));

      await sleep(1500);
      setState((s) => ({
        ...s,
        phases: s.phases.map((p) =>
          p.id === 'build'
            ? {
                ...p,
                tasks: [
                  { ...p.tasks[0], status: 'success', duration: 1500 },
                  { id: 'build-worker', name: 'Building worker-function', status: 'active', startedAt: Date.now() }
                ]
              }
            : p
        )
      }));

      await sleep(1100);
      setState((s) => ({
        ...s,
        phases: s.phases.map((p) =>
          p.id === 'build'
            ? {
                ...p,
                tasks: [
                  p.tasks[0],
                  { ...p.tasks[1], status: 'success', duration: 1100 },
                  {
                    id: 'package-web',
                    name: 'Packaging web-service',
                    status: 'active',
                    startedAt: Date.now(),
                    progress: { current: 0, total: 100 },
                    children: [
                      { id: 'pkg-1', name: 'node_modules', status: 'pending' },
                      { id: 'pkg-2', name: 'dist/', status: 'pending' },
                      { id: 'pkg-3', name: 'public/', status: 'pending' }
                    ]
                  }
                ]
              }
            : p
        )
      }));

      // Animate progress bar
      for (let i = 10; i <= 100; i += 10) {
        await sleep(180);
        setState((s) => ({
          ...s,
          phases: s.phases.map((p) =>
            p.id === 'build'
              ? {
                  ...p,
                  tasks: p.tasks.map((t) =>
                    t.id === 'package-web'
                      ? {
                          ...t,
                          progress: { current: i, total: 100 },
                          children: t.children?.map((c, idx) => ({
                            ...c,
                            status: i >= (idx + 1) * 33 ? 'success' : i >= idx * 33 ? 'active' : 'pending',
                            duration: i >= (idx + 1) * 33 ? 200 + idx * 100 : undefined
                          }))
                        }
                      : t
                  )
                }
              : p
          )
        }));
      }

      await sleep(300);
      setState((s) => ({
        ...s,
        phases: s.phases.map((p) =>
          p.id === 'build'
            ? {
                ...p,
                status: 'success',
                duration: Date.now() - (p.startedAt || Date.now()),
                tasks: p.tasks.map((t) =>
                  t.id === 'package-web'
                    ? {
                        ...t,
                        status: 'success',
                        duration: 1800,
                        progress: undefined,
                        children: t.children?.map((c) => ({ ...c, status: 'success' as const }))
                      }
                    : t
                )
              }
            : p
        )
      }));

      // === PHASE 3: Upload ===
      await sleep(400);
      setState((s) => ({
        ...s,
        currentPhaseId: 'upload',
        phases: s.phases.map((p) =>
          p.id === 'upload'
            ? {
                ...p,
                status: 'active',
                startedAt: Date.now(),
                tasks: [
                  {
                    id: 'upload-artifacts',
                    name: 'Uploading artifacts',
                    status: 'active',
                    startedAt: Date.now(),
                    progress: { current: 0, total: 18.2, unit: 'MB' }
                  }
                ]
              }
            : p
        )
      }));

      // Animate upload progress
      for (let i = 2; i <= 18.2; i += 2) {
        await sleep(120);
        setState((s) => ({
          ...s,
          phases: s.phases.map((p) =>
            p.id === 'upload'
              ? {
                  ...p,
                  tasks: p.tasks.map((t) =>
                    t.id === 'upload-artifacts'
                      ? { ...t, progress: { current: Math.min(i, 18.2), total: 18.2, unit: 'MB' } }
                      : t
                  )
                }
              : p
          )
        }));
      }

      await sleep(300);
      setState((s) => ({
        ...s,
        phases: s.phases.map((p) =>
          p.id === 'upload'
            ? {
                ...p,
                status: 'success',
                duration: Date.now() - (p.startedAt || Date.now()),
                tasks: p.tasks.map((t) => ({
                  ...t,
                  status: 'success' as const,
                  duration: 1300,
                  progress: undefined
                }))
              }
            : p
        )
      }));

      // === Complete ===
      await sleep(600);
      setState((s) => ({
        ...s,
        completedAt: Date.now(),
        currentPhaseId: undefined
      }));

      // Exit after showing completion
      await sleep(3000);
      process.exit(0);
    };

    runDemo();
  }, []);

  return <DeploymentUI state={state} />;
};

// Clear screen and render
process.stdout.write('\x1B[2J\x1B[0f');
render(<Demo />);
