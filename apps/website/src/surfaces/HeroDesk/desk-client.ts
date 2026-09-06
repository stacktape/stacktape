/*
 * The page-side behaviour of the desk.
 *
 * The diagram island owns the picture; this module owns everything in the page's own markup: the
 * project dropdown and the language switch, which pre-rendered pane is showing, the filename and the
 * captions, the schema popups (moved out of the scrolling window so nothing ever clips them), and
 * the links that tie a resource in the file to the same resource in the picture — on hover, on a
 * timer while nobody hovers, or permanently for every visible resource.
 *
 * Imported from a page's `<script>`; Astro bundles it once and shares it between pages.
 */
import { DESK_CHANGE_EVENT, dispatchDeskChange, type DeskChangeDetail, type DeskLanguage } from './desk-events';

export type DeskOptions = {
  /** Walk through the visible resources on a timer while nobody is hovering. Off under reduced motion. */
  attract?: boolean;
  /** `hover`: one link at a time. `all`: a thin wire for every visible resource, the hovered one bright. */
  wires?: 'hover' | 'all';
  /** Which way the curves leave the file: towards a picture beside it, or one below it. */
  direction?: 'horizontal' | 'vertical';
  /** Draw the link from a hovered resource to its node at all. */
  links?: boolean;
};

type Point = { x: number; y: number };

const RESOURCE_LINE = /^\s{2}[A-Za-z0-9_-]+:\s*$/;
const SVG_NS = 'http://www.w3.org/2000/svg';

const textEnd = (line: HTMLElement): DOMRect => {
  const range = document.createRange();
  range.selectNodeContents(line);
  return range.getBoundingClientRect();
};

const placePopup = (popup: HTMLElement, anchor: HTMLElement) => {
  const margin = 12;
  const a = anchor.getBoundingClientRect();
  popup.style.left = '0px';
  popup.style.top = '0px';
  const r = popup.getBoundingClientRect();
  let left = a.left;
  if (left + r.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - margin - r.width);
  let top = a.bottom + 6;
  if (top + r.height > window.innerHeight - margin && a.top - r.height - 6 > margin) top = a.top - r.height - 6;
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
};

export function mountDesk(root: HTMLElement, options: DeskOptions = {}): void {
  const { attract = true, wires = 'hover', direction = 'horizontal', links: linksEnabled = true } = options;

  const editor = root.querySelector<HTMLElement>('[data-desk-editor]');
  if (!editor) return;
  const scroll = editor.querySelector<HTMLElement>('[data-scroll]');
  const panes = Array.from(editor.querySelectorAll<HTMLElement>('[data-pane]'));
  const filename = root.querySelector<HTMLElement>('[data-filename]');
  const captions = Array.from(root.querySelectorAll<HTMLElement>('[data-caption]'));
  // The controls sit in whichever title bar the page gave them, not necessarily in the editor.
  const controls = root.querySelector<HTMLElement>('[data-desk-controls]') ?? editor;
  const dropdown = controls.querySelector<HTMLElement>('[data-dropdown]');
  const dropdownButton = dropdown?.querySelector<HTMLButtonElement>('[data-dropdown-button]') ?? null;
  const dropdownLabel = dropdown?.querySelector<HTMLElement>('[data-dropdown-label]') ?? null;
  const menu = dropdown?.querySelector<HTMLElement>('[data-dropdown-menu]') ?? null;
  const menuOptions = menu ? Array.from(menu.querySelectorAll<HTMLElement>('[role="option"]')) : [];
  const languageButtons = Array.from(controls.querySelectorAll<HTMLButtonElement>('button[data-language]'));
  const links = root.querySelector<SVGSVGElement>('.desk-links');
  const wireGroup = links?.querySelector<SVGGElement>('[data-wires]') ?? null;
  const linkPath = links?.querySelector<SVGPathElement>('.desk-links__path') ?? null;
  const linkRing = links?.querySelector<SVGCircleElement>('.desk-links__ring') ?? null;
  const linkDot = links?.querySelector<SVGCircleElement>('.desk-links__dot') ?? null;
  const diagramHost = root.querySelector<HTMLElement>('[data-desk-diagram]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let project = editor.dataset.project ?? '';
  let language: DeskLanguage = 'yaml';
  let activePane: HTMLElement | null = null;
  let linkedLine: HTMLElement | null = null;
  let hovering = false;
  let cycle = 0;
  let cycleTimer = 0;
  let wireTimer = 0;

  // ── Which pane ───────────────────────────────────────────────────────────────────────────────

  const hasTypescript = (id: string) =>
    panes.some((pane) => pane.dataset.pane === id && pane.dataset.lang === 'typescript');

  const showPane = () => {
    activePane = null;
    for (const pane of panes) {
      const active = pane.dataset.pane === project && pane.dataset.lang === language;
      pane.hidden = !active;
      if (active) activePane = pane;
    }
    editor.dataset.project = project;
    editor.dataset.language = language;
    if (filename) filename.textContent = language === 'yaml' ? 'stacktape.yml' : 'stacktape.ts';
    for (const caption of captions) caption.textContent = activePane?.dataset.summary ?? '';
    for (const button of languageButtons) {
      const active = button.dataset.language === language;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      button.disabled = button.dataset.language === 'typescript' && !hasTypescript(project);
    }
    if (scroll) scroll.scrollTop = 0;
  };

  // ── Lines that name a resource ───────────────────────────────────────────────────────────────

  const resourceLines = (): HTMLElement[] => {
    if (!activePane || language !== 'yaml') return [];
    const names = new Set((activePane.dataset.resources ?? '').split(',').filter(Boolean));
    return Array.from(activePane.querySelectorAll<HTMLElement>('.line')).filter((line) => {
      const text = line.textContent ?? '';
      return RESOURCE_LINE.test(text) && names.has(text.trim().replace(/:$/, ''));
    });
  };

  const isVisible = (line: HTMLElement): boolean => {
    if (!scroll) return true;
    const box = scroll.getBoundingClientRect();
    const rect = line.getBoundingClientRect();
    return rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1;
  };

  const visibleResourceLines = (): HTMLElement[] => resourceLines().filter(isVisible);

  // ── Geometry ─────────────────────────────────────────────────────────────────────────────────

  const nodeFor = (name: string): SVGGraphicsElement | null =>
    root.querySelector<SVGGraphicsElement>(`[data-iso-kind="node"][data-iso-id="${CSS.escape(name)}"]`);

  type Geometry = { start: Point; end: Point; centre: Point; radius: number };

  const geometry = (line: HTMLElement, node: SVGGraphicsElement): Geometry | null => {
    const stage = root.getBoundingClientRect();
    const text = textEnd(line);
    const box = node.getBoundingClientRect();
    if (box.width === 0 || text.width === 0) return null;
    const start: Point =
      direction === 'vertical'
        ? { x: text.right - stage.left + 10, y: text.bottom - stage.top + 2 }
        : { x: text.right - stage.left + 12, y: text.top + text.height / 2 - stage.top };
    const centre: Point = { x: box.left + box.width / 2 - stage.left, y: box.top + box.height * 0.42 - stage.top };
    const radius = Math.max(box.width, box.height) * 0.6;
    const dx = centre.x - start.x;
    const dy = centre.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const end: Point = { x: centre.x - (dx / length) * radius, y: centre.y - (dy / length) * radius };
    return { start, end, centre, radius };
  };

  const curve = ({ start, end }: Geometry): string => {
    if (direction === 'vertical') {
      const bend = Math.max(40, Math.abs(end.y - start.y) * 0.5);
      return `M ${start.x} ${start.y} C ${start.x} ${start.y + bend}, ${end.x} ${end.y - bend}, ${end.x} ${end.y}`;
    }
    const bend = Math.max(60, Math.abs(end.x - start.x) * 0.42);
    return `M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`;
  };

  const sizeOverlay = () => {
    if (!links) return;
    const stage = root.getBoundingClientRect();
    links.setAttribute('viewBox', `0 0 ${stage.width} ${stage.height}`);
  };

  // ── One link: the hovered (or attracted) resource ────────────────────────────────────────────

  const clearLink = () => {
    linkedLine?.classList.remove('is-linked');
    linkedLine = null;
    root.classList.remove('is-linked');
  };

  const showLink = (line: HTMLElement) => {
    if (!linksEnabled || !links || !linkPath || !linkRing || !linkDot) return;
    const name = (line.textContent ?? '').trim().replace(/:$/, '');
    const node = nodeFor(name);
    const shape = node ? geometry(line, node) : null;
    if (!shape || !isVisible(line)) {
      clearLink();
      return;
    }
    sizeOverlay();
    linkPath.setAttribute('d', curve(shape));
    linkRing.setAttribute('cx', String(shape.centre.x));
    linkRing.setAttribute('cy', String(shape.centre.y));
    linkRing.setAttribute('r', String(shape.radius));
    linkDot.setAttribute('cx', String(shape.start.x));
    linkDot.setAttribute('cy', String(shape.start.y));
    linkDot.setAttribute('r', '3');
    linkedLine?.classList.remove('is-linked');
    linkedLine = line;
    line.classList.add('is-linked');
    root.classList.add('is-linked');
  };

  // ── Every wire: one per visible resource, redrawn when anything moves ────────────────────────

  const drawWires = () => {
    if (wires !== 'all' || !wireGroup) return;
    sizeOverlay();
    const wanted = new Map<string, string>();
    for (const line of visibleResourceLines()) {
      const name = (line.textContent ?? '').trim().replace(/:$/, '');
      const node = nodeFor(name);
      const shape = node ? geometry(line, node) : null;
      if (shape) wanted.set(name, curve(shape));
    }
    for (const existing of Array.from(wireGroup.children)) {
      const name = existing.getAttribute('data-for') ?? '';
      if (!wanted.has(name)) existing.remove();
    }
    for (const [name, d] of wanted) {
      let path = wireGroup.querySelector<SVGPathElement>(`[data-for="${CSS.escape(name)}"]`);
      if (!path) {
        path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('class', 'desk-links__wire');
        path.setAttribute('data-for', name);
        wireGroup.appendChild(path);
      }
      path.setAttribute('d', d);
    }
  };

  // A timeout rather than an animation frame: frames stop in a background tab, and the wires must
  // be right the moment the tab is looked at again.
  const scheduleWires = () => {
    if (wires !== 'all') return;
    window.clearTimeout(wireTimer);
    wireTimer = window.setTimeout(drawWires, 16);
  };

  // ── The attract loop ─────────────────────────────────────────────────────────────────────────

  const stopCycle = () => {
    window.clearTimeout(cycleTimer);
    cycleTimer = 0;
  };

  const scheduleCycle = (delay: number) => {
    stopCycle();
    if (!attract || reducedMotion.matches || hovering) return;
    cycleTimer = window.setTimeout(() => {
      const lines = visibleResourceLines();
      if (lines.length === 0) {
        clearLink();
        scheduleCycle(2000);
        return;
      }
      const line = lines[cycle % lines.length];
      cycle += 1;
      if (line) showLink(line);
      scheduleWires();
      scheduleCycle(2600);
    }, delay);
  };

  // ── Schema popups, moved out of the window so nothing clips them ─────────────────────────────

  type OpenPopup = { popup: HTMLElement; anchor: HTMLElement; parent: HTMLElement; next: Node | null };
  let openPopup: OpenPopup | null = null;

  const closePopup = () => {
    if (!openPopup) return;
    const { popup, parent, next } = openPopup;
    popup.classList.remove('is-open');
    popup.style.cssText = '';
    parent.insertBefore(popup, next);
    openPopup = null;
  };

  const openPopupFor = (anchor: HTMLElement) => {
    const popup = anchor.querySelector<HTMLElement>(':scope > .stp-hover-popup');
    const parent = popup?.parentElement;
    if (!popup || !parent) return;
    closePopup();
    const next = popup.nextSibling;
    document.body.appendChild(popup);
    popup.classList.add('is-open');
    placePopup(popup, anchor);
    openPopup = { popup, anchor, parent, next };
  };

  editor.addEventListener('pointerover', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const anchor = target?.closest<HTMLElement>('.stp-hover') ?? null;
    if (anchor && anchor !== openPopup?.anchor) openPopupFor(anchor);
  });

  document.addEventListener('pointerover', (event) => {
    if (!openPopup) return;
    const target = event.target instanceof Node ? event.target : null;
    if (target && (openPopup.popup.contains(target) || openPopup.anchor.contains(target))) return;
    closePopup();
  });

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') closePopup();
  });

  // ── The project dropdown ─────────────────────────────────────────────────────────────────────

  let focusIndex = -1;

  const focusOption = (index: number) => {
    focusIndex = (index + menuOptions.length) % menuOptions.length;
    menuOptions.forEach((option, i) => option.classList.toggle('is-focused', i === focusIndex));
    menuOptions[focusIndex]?.focus();
  };

  const closeMenu = (restoreFocus = false) => {
    if (!dropdown || !menu || !dropdownButton) return;
    menu.hidden = true;
    delete dropdown.dataset.open;
    dropdownButton.setAttribute('aria-expanded', 'false');
    menuOptions.forEach((option) => option.classList.remove('is-focused'));
    if (restoreFocus) dropdownButton.focus();
  };

  const openMenu = () => {
    if (!dropdown || !menu || !dropdownButton) return;
    menu.hidden = false;
    dropdown.dataset.open = 'true';
    dropdownButton.setAttribute('aria-expanded', 'true');
    const selected = menuOptions.findIndex((option) => option.dataset.value === project);
    focusOption(selected >= 0 ? selected : 0);
  };

  const setProject = (next: string) => {
    if (!next || next === project) return;
    project = next;
    if (!hasTypescript(project)) language = 'yaml';
    for (const option of menuOptions) option.setAttribute('aria-selected', String(option.dataset.value === project));
    const label = menuOptions.find((option) => option.dataset.value === project)?.querySelector('.desk-dropdown__name');
    if (dropdownLabel && label) dropdownLabel.textContent = label.textContent;
    closePopup();
    clearLink();
    cycle = 0;
    showPane();
    dispatchDeskChange({ project, language });
    scheduleCycle(1500);
    scheduleWires();
  };

  const setLanguage = (next: DeskLanguage) => {
    if (next === language) return;
    if (next === 'typescript' && !hasTypescript(project)) return;
    language = next;
    closePopup();
    clearLink();
    showPane();
    dispatchDeskChange({ project, language });
    scheduleCycle(1500);
    scheduleWires();
  };

  dropdownButton?.addEventListener('click', () => {
    if (menu?.hidden) openMenu();
    else closeMenu(true);
  });

  dropdownButton?.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu();
    }
  });

  menuOptions.forEach((option, index) => {
    option.addEventListener('click', () => {
      setProject(option.dataset.value ?? '');
      closeMenu(true);
    });
    option.addEventListener('pointerenter', () => {
      focusIndex = index;
      menuOptions.forEach((other, i) => other.classList.toggle('is-focused', i === index));
    });
  });

  menu?.addEventListener('keydown', (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusOption(focusIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusOption(focusIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusOption(0);
        break;
      case 'End':
        event.preventDefault();
        focusOption(menuOptions.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        setProject(menuOptions[focusIndex]?.dataset.value ?? '');
        closeMenu(true);
        break;
      case 'Escape':
        event.preventDefault();
        closeMenu(true);
        break;
      case 'Tab':
        closeMenu();
        break;
      default:
        break;
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (!dropdown || menu?.hidden) return;
    const target = event.target instanceof Node ? event.target : null;
    if (target && !dropdown.contains(target)) closeMenu();
  });

  for (const button of languageButtons) {
    button.addEventListener('click', () => {
      const value = button.dataset.language;
      if (value === 'yaml' || value === 'typescript') setLanguage(value);
    });
  }

  // ── Hover on the file ────────────────────────────────────────────────────────────────────────

  editor.addEventListener('pointerover', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const line = target?.closest<HTMLElement>('.line') ?? null;
    if (!line || !activePane?.contains(line)) return;
    hovering = true;
    stopCycle();
    if (RESOURCE_LINE.test(line.textContent ?? '')) showLink(line);
  });

  editor.addEventListener('pointerleave', () => {
    hovering = false;
    scheduleCycle(1200);
  });

  scroll?.addEventListener(
    'scroll',
    () => {
      closePopup();
      if (linkedLine) showLink(linkedLine);
      scheduleWires();
    },
    { passive: true }
  );

  window.addEventListener('resize', () => {
    closePopup();
    if (linkedLine) showLink(linkedLine);
    scheduleWires();
  });

  // The picture mounts and remounts on its own schedule, and its nodes only have a size once the
  // scene has laid out; redraw a moment after every change, and a few more times while it settles.
  let settleTimer = 0;
  const redrawSoon = () => {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      if (linkedLine) showLink(linkedLine);
      scheduleWires();
    }, 80);
  };
  if (diagramHost) {
    const observer = new MutationObserver(redrawSoon);
    observer.observe(diagramHost, { childList: true, subtree: true, attributes: true });
  }
  for (const delay of [400, 1200, 2500]) window.setTimeout(scheduleWires, delay);

  // The event is also how another script could drive the desk; keep the page in step with it.
  document.addEventListener(DESK_CHANGE_EVENT, (event) => {
    const detail = (event as CustomEvent<DeskChangeDetail>).detail;
    if (detail.project !== project || detail.language !== language) {
      project = detail.project;
      language = detail.language;
      showPane();
    }
  });

  // Everything the server rendered is already correct; this only starts the motion.
  showPane();
  scheduleCycle(1600);
  scheduleWires();
}
