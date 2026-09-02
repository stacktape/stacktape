/*
 * The three macOS window dots.
 *
 * Its own file because all three frames draw them and they must stay pixel-identical: three windows
 * on one page with subtly different chrome reads as three screenshots from three apps.
 */

/** macOS system colours. Hard-coded rather than tokenised: these are not Stacktape's palette. */
const LIGHTS = ['#ff5f57', '#febc2e', '#28c840'] as const;

export function TrafficLights() {
  return (
    <span className="surface-frame__lights" aria-hidden="true">
      {LIGHTS.map((color) => (
        <span key={color} style={{ background: color }} />
      ))}
    </span>
  );
}
