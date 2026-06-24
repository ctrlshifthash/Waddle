import { useState } from "react";
import { sceneBridge } from "../game/sceneBridge";

const MIN = 1, MAX = 2.5, STEP = 0.5;
const clamp = (z: number) => Math.min(MAX, Math.max(MIN, Math.round(z * 100) / 100));

/** Small +/- overlay that drives the Phaser camera zoom (see WorldScene.setUserZoom).
 *  At 100% the whole room fits; above that the camera zooms in and follows you. */
export function ZoomControls() {
  const [zoom, setZoom] = useState(() => clamp(Number(localStorage.getItem("cp_zoom")) || 1));
  const apply = (z: number) => {
    const nz = clamp(z);
    setZoom(nz);
    sceneBridge.scene?.setUserZoom(nz);
  };
  return (
    <div className="zoom-controls">
      <button className="zoom-btn" title="Zoom in" onClick={() => apply(zoom + STEP)} disabled={zoom >= MAX}>+</button>
      <span className="zoom-label" title="Reset zoom" onClick={() => apply(1)}>{Math.round(zoom * 100)}%</span>
      <button className="zoom-btn" title="Zoom out" onClick={() => apply(zoom - STEP)} disabled={zoom <= MIN}>−</button>
    </div>
  );
}
