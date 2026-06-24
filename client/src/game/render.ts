// Supersample factor for the Phaser WebGL backing store. The game is authored in a
// fixed 1066x600 "world viewport", but outdoor rooms zoom the camera out to ~0.55x
// and the canvas is then stretched to fill the display — so at 1x backing, text and
// fine detail get rendered into very few pixels and look blurry. Rendering the
// backing store at RENDER_SCALEx (and zooming the camera to match) keeps everything
// crisp. Capped at 3x so fill-rate stays reasonable on high-DPR screens.
export const RENDER_SCALE = Math.min(3, Math.max(2, Math.ceil(window.devicePixelRatio || 1)));
