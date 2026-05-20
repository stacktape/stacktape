import type { NavItem } from './navigation-data';

// Sits ~14px to the left of the row's text (text starts at `pill-margin(8) + ROW_BASE_INDENT(10) +
// depth*DEPTH_STEP(12)`, so for the first nested depth that's x=30; we anchor the guide at 16 to
// leave a ToC-like gap between the curve and the label).
const GUIDE_X_BASE = 16;
const GUIDE_INDENT_STEP = 12;
const GUIDE_TRANSITION_ZONE = 8;

export type FlatGuideItem = { depth: number };

export const flattenVisibleItems = (
  items: NavItem[],
  depth: number,
  expandedItems: Record<string, boolean>
): FlatGuideItem[] => {
  const out: FlatGuideItem[] = [];
  for (const item of items) {
    out.push({ depth });
    if (item.children.length > 0 && (expandedItems[item.key] ?? false)) {
      out.push(...flattenVisibleItems(item.children, depth + 1, expandedItems));
    }
  }
  return out;
};

// Builds the curved guide path from a flat list of items paired with their measured y-centers.
// Each entry is `{ depth, centerY }`; depth determines x, centerY anchors the path to the actual
// row in the DOM. Mirrors the ToC's curve: vertical L-segments between same-depth items,
// cubic-bezier S-curves through the row midpoint when depth changes. Extends up to y=0 and down
// past the last row so the line never starts or ends mid-row.
export const buildGuidePath = (
  flat: { depth: number; centerY: number }[],
  totalHeight: number
) => {
  if (flat.length === 0) return null;

  const minDepth = Math.min(...flat.map((f) => f.depth));
  const maxDepth = Math.max(...flat.map((f) => f.depth));
  const depthToX = (d: number) => GUIDE_X_BASE + (d - minDepth) * GUIDE_INDENT_STEP;

  const pts = flat.map((it) => ({ x: depthToX(it.depth), y: it.centerY }));

  let d = `M ${pts[0].x} 0 L ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cur = pts[i];
    const next = pts[i + 1];
    if (next.x === cur.x) {
      d += ` L ${next.x} ${next.y}`;
    } else {
      const midY = (cur.y + next.y) / 2;
      d += ` L ${cur.x} ${midY - GUIDE_TRANSITION_ZONE}`;
      d += ` C ${cur.x} ${midY}, ${next.x} ${midY}, ${next.x} ${midY + GUIDE_TRANSITION_ZONE}`;
      d += ` L ${next.x} ${next.y}`;
    }
  }
  d += ` L ${pts[pts.length - 1].x} ${totalHeight}`;

  return {
    d,
    width: depthToX(maxDepth) + 4,
    height: totalHeight
  };
};
