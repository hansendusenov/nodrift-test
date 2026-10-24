import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  THIRD_PERSON_DISTANCE,
  WALK_SPEED,
  clampOrbitPitch,
  maxOrbitDistance,
  moveVector,
  movementKeyFromCode,
  normalizeYaw,
  stepPosition,
  thirdPersonCamera,
  turnToward,
  yawFromDirection,
} from '../../domain/showroomNavigation.js';

/**
 * Third-person camera controller (RPG-style follow camera).
 *
 * Design notes
 * ------------
 * Two angles are tracked, and they are not the same thing:
 *
 *   `orbitYaw`   where the camera looks. Drag turns this.
 *   `avatarYaw`  where the body faces. It eases toward the walk direction.
 *
 * Movement is relative to `orbitYaw` (pressing W walks away from the camera,
 * whichever way the camera has been swung), while the body turns to face the
 * direction it is actually travelling. That split is what makes the rig feel
 * like a game instead of a car with a camera bolted to the back.
 *
 * The camera itself is a pure function of (avatar position, orbitYaw, pitch,
 * distance) — see `thirdPersonCamera`. Nothing here invents geometry, so the
 * framing can be unit tested without a WebGL context.
 *
 * As in the first-person controller, all per-frame state lives in refs: this
 * runs at 60 fps and re-rendering the tree each frame would be wasteful.
 */
export function ThirdPersonControls({
  spawn,
  enabled = true,
  onNearbyChange,
  anchors = [],
  findNearest,
  externalInput,
  motionRef,
  onAvatarMove,
}) {
  const { camera, gl } = useThree();

  const stateRef = useRef({
    orbitYaw: spawn?.yaw ?? 0,
    avatarYaw: spawn?.yaw ?? 0,
    pitch: 0.42,
    distance: THIRD_PERSON_DISTANCE,
    position: { x: spawn?.x ?? 0, z: spawn?.z ?? 0 },
    input: { forward: false, backward: false, left: false, right: false },
    dragging: false,
    lastPointer: { x: 0, y: 0 },
    // Reports the walking state to the avatar animation without state updates
    speed: 0,
  });

  const lastNearbyRef = useRef(null);
  const padInputRef = useRef(externalInput || {});

  useEffect(() => {
    padInputRef.current = externalInput || {};
  }, [externalInput]);

  // Re-seed when the spawn point changes (entering the mode again)
  useEffect(() => {
    const state = stateRef.current;
    state.orbitYaw = spawn?.yaw ?? 0;
    state.avatarYaw = spawn?.yaw ?? 0;
    state.pitch = 0.42;
    state.distance = THIRD_PERSON_DISTANCE;
    state.position = { x: spawn?.x ?? 0, z: spawn?.z ?? 0 };
    state.input = { forward: false, backward: false, left: false, right: false };
  }, [spawn]);

  // Portrait canvases have a narrow horizontal field, so a car at the edge of
  // the ring falls outside a 68-degree view. Widening the vertical FOV on
  // portrait restores a usable horizontal field. Same reasoning as the
  // first-person controller; the values differ because the camera is further
  // back, so less width is needed to frame the same subject.
  useEffect(() => {
    const applyFov = () => {
      const aspect = gl.domElement.clientWidth / Math.max(1, gl.domElement.clientHeight);
      // The camera is a mutable Three.js object by design; R3F hands out the
      // live instance and expects direct mutation. There is no state to update.
      // eslint-disable-next-line react/immutability
      camera.fov = aspect < 1 ? 70 : 58;
      camera.updateProjectionMatrix();
    };

    applyFov();
    window.addEventListener('resize', applyFov);
    return () => window.removeEventListener('resize', applyFov);
  }, [camera, gl]);

  useEffect(() => {
    if (!enabled) {
      const paused = stateRef.current;
      paused.input = { forward: false, backward: false, left: false, right: false };
      paused.dragging = false;
      paused.speed = 0;
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

    const releaseAll = () => {
      state.input = { forward: false, backward: false, left: false, right: false };
      state.dragging = false;
      state.speed = 0;
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

      // Dragging right swings the camera left around the avatar, matching the
      // first-person feel: the world moves with the hand, not against it.
      state.orbitYaw = normalizeYaw(state.orbitYaw - dx * 0.0032);
      state.pitch = clampOrbitPitch(state.pitch + dy * 0.0026);
    };

    const handlePointerUp = (event) => {
      state.dragging = false;
      if (element.hasPointerCapture?.(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    };

    // Wheel zoom: closer for inspecting a car's interior, further for the hall.
    const handleWheel = (event) => {
      if (!event.ctrlKey) event.preventDefault();
      const limit = maxOrbitDistance();
      const next = state.distance + event.deltaY * 0.0022;
      state.distance = Math.min(limit, Math.max(2.2, next));
    };

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerUp);
    element.addEventListener('pointerleave', handlePointerUp);
    element.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseAll);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerUp);
      element.removeEventListener('pointerleave', handlePointerUp);
      element.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseAll);
    };
  }, [enabled, gl]);

  useFrame((_, rawDelta) => {
    const state = stateRef.current;
    const delta = Math.min(rawDelta, 0.1);

    let moving = false;

    if (enabled) {
      const pad = padInputRef.current;
      const merged = {
        forward: state.input.forward || Boolean(pad.forward),
        backward: state.input.backward || Boolean(pad.backward),
        left: state.input.left || Boolean(pad.left),
        right: state.input.right || Boolean(pad.right),
      };

      const next = stepPosition(state.position, merged, { yaw: state.orbitYaw, delta });
      moving = next.x !== state.position.x || next.z !== state.position.z;
      state.position = next;
      state.speed = moving ? WALK_SPEED : 0;

      // Turn the body toward travel, not toward the camera: strafing should
      // look like walking sideways-then-turning, not like sliding.
      if (moving) {
        const direction = moveVector(state.orbitYaw, merged);
        const desired = yawFromDirection(direction);
        if (desired !== null) {
          state.avatarYaw = turnToward(state.avatarYaw, desired, delta);
        }
      }

      // Report the nearest car only when it changes, not every frame
      if (findNearest) {
        const nearest = findNearest(next, anchors);
        const nextId = nearest?.carId ?? null;
        if (nextId !== lastNearbyRef.current) {
          lastNearbyRef.current = nextId;
          onNearbyChange?.(nextId);
        }
      }
    } else {
      state.speed = 0;
    }

    // Hand the walk state to the avatar's animation without a re-render
    if (motionRef) {
      motionRef.current = { moving, speed: state.speed };
    }

    if (onAvatarMove) {
      onAvatarMove(state.position, state.avatarYaw);
    }

    const { position, target } = thirdPersonCamera(
      state.position,
      state.orbitYaw,
      state.pitch,
      { distance: state.distance }
    );

    camera.position.set(position.x, position.y, position.z);
    camera.lookAt(target.x, target.y, target.z);
  });

  return null;
}

export default ThirdPersonControls;
