import type { CSSProperties, ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { BiCheck, BiX } from 'react-icons/bi';
import { TbCloudUpload, TbFileSearch, TbStack2, TbWorld } from 'react-icons/tb';
import type { Station, StationId } from '../stations';

const ICONS: Record<StationId, IconType> = {
  analyze: TbFileSearch,
  review: TbStack2,
  deploy: TbCloudUpload,
  live: TbWorld
};

const STATUS_WORDS: Record<Station['status'], string> = {
  pending: '',
  current: ', your turn',
  working: ', in progress',
  done: ', done',
  failed: ', stopped here'
};

/**
 * The run as a path, left to right, drawn the way the Console draws a first deploy: a ring per station, a check or a
 * cross once it is behind you, a turning arc while the run works on its own, and the line between two stations filled once
 * the run has passed it.
 *
 * With `walkthrough`, nothing has started: a light runs along the path and wakes each station in turn. It stays
 * neutral, without the brand colour, checks or arcs of a real run, so it cannot be read as one that is running.
 */
const NO_ACTIONS: Partial<Record<StationId, ReactNode>> = {};

export function StepPath({
  stations,
  walkthrough = false,
  actions = NO_ACTIONS
}: {
  stations: Station[];
  walkthrough?: boolean;
  /** A control under a station's note, such as the way back into a finished step. */
  actions?: Partial<Record<StationId, ReactNode>>;
}) {
  return (
    <ol aria-label="Progress" className={`wizard-path${walkthrough ? ' is-walkthrough' : ''}`}>
      {stations.map((station, index) => {
        const Icon = ICONS[station.id];
        const next = stations[index + 1];
        const linked = next !== undefined && next.status !== 'pending';
        return (
          <li
            aria-current={station.status === 'current' || station.status === 'working' ? 'step' : undefined}
            className={`wizard-station is-${station.status}${linked ? ' is-linked' : ''}`}
            key={station.id}
            style={{ '--station-index': index } as CSSProperties}
          >
            <span aria-hidden className="wizard-station-node">
              <svg className="wizard-station-rings" height="52" viewBox="0 0 52 52" width="52">
                <circle className="wizard-station-ring" cx="26" cy="26" r="23" />
                {station.status === 'working' && <circle className="wizard-station-arc" cx="26" cy="26" r="23" />}
              </svg>
              <Icon className="wizard-station-icon" size={22} />
              {(station.status === 'done' || station.status === 'failed') && (
                <span className="wizard-station-badge">
                  {station.status === 'done' ? <BiCheck size={14} /> : <BiX size={14} />}
                </span>
              )}
            </span>
            <span className="wizard-station-title">
              {station.title}
              <span className="sr-only">{STATUS_WORDS[station.status]}</span>
            </span>
            <span className="wizard-station-note">{station.note}</span>
            {actions[station.id]}
          </li>
        );
      })}
    </ol>
  );
}
