import React from 'react';

/**
 * Error boundary for the 3D stage.
 *
 * Three.js failures are not catchable with a try/catch: a rejected texture
 * fetch or an unsupported GPU feature surfaces as a thrown error during render
 * of the canvas subtree. Without a boundary, React unmounts the whole page and
 * the visitor sees a blank screen with no way back to the catalog.
 *
 * Only the stage is wrapped, so a broken model costs the visitor the 3D view,
 * not the rental flow.
 *
 * Resetting is the caller's job: give the boundary a new `key` to remount it.
 * A `componentDidUpdate` reset would set state during an update and render
 * twice for no reason.
 */
export class StageBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    // Surface the real reason to the console for debugging, and to the parent
    // so it can render a specific message rather than a generic one.
    console.error('[Showroom] 3D stage failed:', error);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.error) {
      // The parent owns the user-facing error UI, so render nothing here.
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}

export default StageBoundary;
