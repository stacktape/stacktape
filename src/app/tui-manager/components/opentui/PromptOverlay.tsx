/** @jsxImportSource @opentui/react */

import { useState, useMemo } from 'react';
import { useKeyboard } from '@opentui/react';
import type {
  TuiPrompt,
  TuiPromptConfirm,
  TuiPromptMultiSelect,
  TuiPromptSelect,
  TuiPromptText,
  TuiSelectOption
} from '../../types';
import { useTuiState } from './use-tui-state';

const ensureUniqueOptions = (options: TuiSelectOption[]) => {
  const valueCount = new Map<string, number>();
  const uniqueOptions: TuiSelectOption[] = [];
  const valueMap = new Map<string, string>();

  for (const opt of options) {
    const count = valueCount.get(opt.value) || 0;
    valueCount.set(opt.value, count + 1);
    const uniqueValue = count === 0 ? opt.value : `${opt.value}__${count}`;
    uniqueOptions.push({ label: opt.label, value: uniqueValue, description: opt.description });
    valueMap.set(uniqueValue, opt.value);
  }
  return { uniqueOptions, valueMap };
};

const SelectPrompt = ({ prompt }: { prompt: TuiPromptSelect }) => {
  const { uniqueOptions, valueMap } = useMemo(() => ensureUniqueOptions(prompt.options), [prompt.options]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const maxVisible = Math.min(uniqueOptions.length, 15);
  const halfWindow = Math.floor(maxVisible / 2);
  const startIndex = Math.max(0, Math.min(selectedIndex - halfWindow, uniqueOptions.length - maxVisible));
  const visibleOptions = uniqueOptions.slice(startIndex, startIndex + maxVisible);

  useKeyboard((key) => {
    if (key.name === 'up') {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : uniqueOptions.length - 1));
    } else if (key.name === 'down') {
      setSelectedIndex((prev) => (prev < uniqueOptions.length - 1 ? prev + 1 : 0));
    } else if (key.name === 'return') {
      const uniqueValue = uniqueOptions[selectedIndex].value;
      const originalValue = valueMap.get(uniqueValue) || uniqueValue;
      prompt.resolve(originalValue);
    } else if (key.name === 'escape') {
      prompt.reject?.();
    }
  });

  return (
    <box flexDirection="column">
      <text fg="#e5e7eb">
        <b>{prompt.message}</b>
      </text>
      <box height={1} />
      {startIndex > 0 ? <text fg="#6b7280"> ^ {startIndex} more above</text> : null}
      {visibleOptions.map((opt, i) => {
        const actualIndex = startIndex + i;
        const isSelected = actualIndex === selectedIndex;
        return (
          <box key={opt.value} flexDirection="row">
            <text fg={isSelected ? '#06b6d4' : '#9ca3af'}>{isSelected ? '› ' : '  '}</text>
            {isSelected ? (
              <text fg="#06b6d4">
                <b>{opt.label}</b>
              </text>
            ) : (
              <text fg="#d1d5db">{opt.label}</text>
            )}
            {opt.description ? <text fg="#6b7280"> {opt.description}</text> : null}
          </box>
        );
      })}
      {startIndex + maxVisible < uniqueOptions.length ? (
        <text fg="#6b7280"> v {uniqueOptions.length - startIndex - maxVisible} more below</text>
      ) : null}
      <box height={1} />
      <text fg="#4b5563">↑↓ navigate Enter select Esc cancel</text>
    </box>
  );
};

const MultiSelectPrompt = ({ prompt }: { prompt: TuiPromptMultiSelect }) => {
  const { uniqueOptions, valueMap } = useMemo(() => ensureUniqueOptions(prompt.options), [prompt.options]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [checked, setChecked] = useState<Set<string>>(() => {
    if (!prompt.defaultValues) return new Set();
    const initial = new Set<string>();
    for (const v of prompt.defaultValues) {
      for (const [uv, ov] of valueMap.entries()) {
        if (ov === v) {
          initial.add(uv);
          break;
        }
      }
    }
    return initial;
  });

  useKeyboard((key) => {
    if (key.name === 'up') {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : uniqueOptions.length - 1));
    } else if (key.name === 'down') {
      setSelectedIndex((prev) => (prev < uniqueOptions.length - 1 ? prev + 1 : 0));
    } else if (key.name === 'space') {
      const value = uniqueOptions[selectedIndex].value;
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
      });
    } else if (key.name === 'return') {
      const originalValues = Array.from(checked).map((v) => valueMap.get(v) || v);
      prompt.resolve(originalValues);
    } else if (key.name === 'escape') {
      prompt.reject?.();
    }
  });

  return (
    <box flexDirection="column">
      <text fg="#e5e7eb">
        <b>{prompt.message}</b>
      </text>
      <box height={1} />
      {uniqueOptions.map((opt, i) => {
        const isSelected = i === selectedIndex;
        const isChecked = checked.has(opt.value);
        const checkmark = isChecked ? '◉' : '○';
        return (
          <box key={opt.value} flexDirection="row">
            <text fg={isSelected ? '#06b6d4' : '#6b7280'}>{isSelected ? '› ' : '  '}</text>
            <text fg={isChecked ? '#22c55e' : '#6b7280'}>{checkmark} </text>
            {isSelected ? (
              <text fg="#06b6d4">
                <b>{opt.label}</b>
              </text>
            ) : (
              <text fg="#d1d5db">{opt.label}</text>
            )}
            {opt.description ? <text fg="#6b7280"> {opt.description}</text> : null}
          </box>
        );
      })}
      <box height={1} />
      <text fg="#4b5563">↑↓ navigate Space toggle Enter confirm Esc cancel</text>
    </box>
  );
};

const ConfirmPrompt = ({ prompt }: { prompt: TuiPromptConfirm }) => {
  useKeyboard((key) => {
    if (key.sequence === 'y' || key.sequence === 'Y') {
      prompt.resolve(true);
    } else if (key.sequence === 'n' || key.sequence === 'N') {
      prompt.resolve(false);
    } else if (key.name === 'return') {
      prompt.resolve(prompt.defaultValue !== false);
    } else if (key.name === 'escape') {
      prompt.reject?.();
    }
  });

  const defaultHint = prompt.defaultValue === false ? 'y/N' : 'Y/n';

  return (
    <box flexDirection="row">
      <text fg="#e5e7eb">
        <b>{prompt.message}</b>
      </text>
      <text fg="#6b7280"> ({defaultHint}) </text>
    </box>
  );
};

const TextPrompt = ({ prompt }: { prompt: TuiPromptText }) => {
  const [value, setValue] = useState(prompt.defaultValue || '');

  useKeyboard((key) => {
    if (key.name === 'return') {
      const finalValue = value === '' && prompt.defaultValue ? prompt.defaultValue : value;
      prompt.resolve(finalValue);
    } else if (key.name === 'escape') {
      prompt.reject?.();
    } else if (key.name === 'backspace') {
      setValue((prev) => prev.slice(0, -1));
    } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      setValue((prev) => prev + key.sequence);
    }
  });

  const displayValue = prompt.isPassword ? '•'.repeat(value.length) : value;

  return (
    <box flexDirection="column">
      <box flexDirection="row">
        <text fg="#e5e7eb">
          <b>{prompt.message}</b>
        </text>
        {prompt.description ? <text fg="#6b7280"> {prompt.description}</text> : null}
      </box>
      <box flexDirection="row">
        <text fg="#06b6d4">{'> '}</text>
        <text fg="#e5e7eb">{displayValue || ''}</text>
        <text fg="#06b6d4">█</text>
        {!value && prompt.placeholder ? <text fg="#4b5563"> {prompt.placeholder}</text> : null}
      </box>
      <box height={1} />
      <text fg="#4b5563">Enter submit Esc cancel</text>
    </box>
  );
};

const PromptRouter = ({ prompt }: { prompt: TuiPrompt }) => {
  switch (prompt.type) {
    case 'select':
      return <SelectPrompt prompt={prompt} />;
    case 'multiSelect':
      return <MultiSelectPrompt prompt={prompt} />;
    case 'confirm':
      return <ConfirmPrompt prompt={prompt} />;
    case 'text':
      return <TextPrompt prompt={prompt} />;
    default:
      return null;
  }
};

export const PromptOverlay = () => {
  const activePrompt = useTuiState((s) => s.activePrompt);

  if (!activePrompt) return null;

  return (
    <box flexDirection="column" borderStyle="single" borderColor="#06b6d4" paddingX={1} paddingY={1}>
      <PromptRouter prompt={activePrompt} />
    </box>
  );
};
