import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  EYE_HEIGHT,
  LOOK_SENSITIVITY,
  clampPitch,
  movementKeyFromCode,
  normalizeYaw,
  stepPosition,
} from '../../domain/showroomNavigation.js';

/**
 * First-person camera controller.
 *
 * Design notes
 * ------------
 * The camera is driven imperatively inside `useFrame` rather than through React
 * state. Position changes every frame; putting that in state would re-render
 * the tree 60 times a second for no visual benefit.
 *
 * Input is captured on the canvas element only (not `window`), so typing in a
 * dialog elsewhere in the app can never drive the visitor around the hall.
 *
 * Pointer lock is deliberately not used: it requires a user gesture, hides the
 * cursor, and is awkward on touch. Drag-to-look works with mouse, pen and
 * finger through the same pointer events.
 */
export function VisitorControls({
  spawn,
  enabled = true,
  onNearbyChange,
  anchors = [],
  findNearest,
  externalInput,
}) {
  const { camera, gl } = useThree();

  // A fixed vertical FOV crops the hall badly on a narrow portrait canvas: the
  // horizontal field shrinks with the aspect ratio, so cars at the edge of the
  // ring fall outside the frame. Widening the vertical FOV on portrait keeps a
  // usable horizontal field without the fisheye distortion that fitting the
  // whole ring would require (~123 degrees, which is not a usable view).
  // Cars at the very edge of the frame being clipped is correct first-person
  // behaviour; the visitor turns their head to see them.
  useEffect(() => {
    const applyFov = () => {
      const aspect = gl.domElement.clientWidth / Math.max(1, gl.domElement.clientHeight);
      // The camera is a mutable Three.js object by design; R3F hands out the
      // live instance and expects direct mutation. There is no state to update.
      // eslint-disable-next-line react/immutability
      camera.fov = aspect < 1 ? 82 : 68;
      camera.updateProjectionMatrix();
    };

    applyFov();
    window.addEventListener('resize', applyFov);
    return () => window.removeEventListener('resize', applyFov);
  }, [camera, gl]);

  // Live input, kept in refs so the frame loop reads current values without
  // re-subscribing listeners on every state change.
  const stateRef = useRef({
    yaw: spawn?.yaw ?? 0,
    pitch: 0,
    position: { x: spawn?.x ?? 0, z: spawn?.z ?? 0 },
    input: { forward: false, backward: false, left: false, right: false },
    dragging: false,
    lastPointer: { x: 0, y: 0 },
  });

  const lastNearbyRef = useRef(null);

  // Touch-pad input arrives as a prop; mirrored into a ref so the frame loop
  // reads the latest value without re-registering listeners.
  const padInputRef = useRef(externalInput || {});
  useEffect(() => {
    padInputRef.current = externalInput || {};
  }, [externalInput]);

  // Re-seed when the spawn point changes (entering the mode again)
  useEffect(() => {
    const state = stateRef.current;
    state.yaw = spawn?.yaw ?? 0;
    state.pitch = 0;
    state.position = { x: spawn?.x ?? 0, z: spawn?.z ?? 0 };
    state.input = { forward: false, backward: false, left: false, right: false };
  }, [spawn]);

  useEffect(() => {
    if (!enabled) {
      // Pausing (e.g. a dialog opened) must also drop any key still held,
      // otherwise the visitor keeps walking behind the dialog.
      const paused = stateRef.current;
      paused.input = { forward: false, backward: false, left: false, right: false };
      paused.dragging = false;
      padInputRef.current = {};
      return undefined;
    }

    const element = gl.domElement;
    const state = stateRef.current;

    const isTypingTarget = (target) => {
      const tag = target?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
    };

    const handleKeyDown = (event) => {
      if (isTypingTarget(event.target)) return;
      const key = movementKeyFromCode(event.code);
      if (!key) return;
      // Arrow keys would otherwise scroll the page under the canvas
      event.preventDefault();
      state.input[key] = true;
    };

    const handleKeyUp = (event) => {
      const key = movementKeyFromCode(event.code);
      if (!key) return;
      state.input[key] = false;
    };

    // Releasing focus while a key is held would leave the visitor walking
    // forever, so clear everything on blur.
    const releaseAll = () => {
      state.input = { forward: false, backward: false, left: false, right: false };
      state.dragging = false;
    };

    const handlePointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      state.dragging = true;
      state.lastPointer = { x: event.clientX, y: event.clientY };
      element.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (!state.dragging) return;
      const dx = event.clientX - state.lastPointer.x;
      const dy = event.clientY - state.lastPointer.y;
      state.lastPointer = { x: event.clientX, y: event.clientY };

      state.yaw = normalizeYaw(state.yaw - dx * LOOK_SENSITIVITY);
      state.pitch = clampPitch(state.pitch - dy * LOOK_SENSITIVITY);
    };

    const handlePointerUp = (event) => {
      state.dragging = false;
      if (element.hasPointerCapture?.(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    };

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerUp);
    element.addEventListener('pointerleave', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseAll);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerUp);
      element.removeEventListener('pointerleave', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseAll);
    };
  }, [enabled, gl]);

  useFrame((_, rawDelta) => {
    const state = stateRef.current;
    const delta = Math.min(rawDelta, 0.1);

    if (enabled) {
      // Keyboard and touch-pad inputs are merged here, not in the domain
      // helper: either source alone can drive movement, and holding both must
      // not double the speed.
      const pad = padInputRef.current;
      const merged = {
        forward: state.input.forward || Boolean(pad.forward),
        backward: state.input.backward || Boolean(pad.backward),
        left: state.input.left || Boolean(pad.left),
        right: state.input.right || Boolean(pad.right),
      };

      const next = stepPosition(state.position, merged, { yaw: state.yaw, delta });
      state.position = next;

      // Report the nearest car only when it changes, not every frame
      if (findNearest) {
        const nearest = findNearest(next, anchors);
        const nextId = nearest?.carId ?? null;
        if (nextId !== lastNearbyRef.current) {
          lastNearbyRef.current = nextId;
          onNearbyChange?.(nextId);
        }
      }
    }

    camera.position.set(state.position.x, EYE_HEIGHT, state.position.z);
    camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
  });

  return null;
}

export default VisitorControls;
