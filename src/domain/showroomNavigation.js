/**
 * First-person walk domain logic for the Virtual mode.
 *
 * Adheres to nodrift-standard Section 2: no React, no Three.js, no DOM.
 * The camera maths is plain arithmetic so the movement rules can be unit
 * tested in Node, which matters because a bug here is invisible in a
 * screenshot — the camera simply drifts somewhere it should not.
 *
 * Coordinate convention follows Three.js: +X is right, +Z is toward the
 * viewer, and a camera with yaw 0 looks down -Z.
 */

/** Walkable floor half-extent. Walls sit at this distance on both axes. */
export const WALK_HALF_EXTENT = 9.4;

/** Camera height in metres. A seated eye is ~1.2; a standing one ~1.6. */
export const EYE_HEIGHT = 1.62;

/** Metres per second while a movement key is held. */
export const WALK_SPEED = 3.6;

/** Radians of yaw per pixel of pointer drag. */
export const LOOK_SENSITIVITY = 0.0032;

/** Pitch clamp, in radians. Prevents flipping over the poles. */
export const MIN_PITCH = -0.85;
export const MAX_PITCH = 0.55;

/** How close the visitor must stand before a car can be inspected. */
export const INTERACT_DISTANCE = 3.4;

/* --------------------------------------------------------------------------
   Third-person rig
   --------------------------------------------------------------------------
   In third person the camera no longer *is* the visitor: it orbits a visible
   avatar. Keeping that maths here (rather than inside the frame loop) is what
   makes it testable — a wrong sign in the orbit is invisible in a screenshot
   until the camera ends up inside the floor.
   -------------------------------------------------------------------------- */

/** Metres from the avatar to the camera, along the view direction. */
export const THIRD_PERSON_DISTANCE = 4.3;

/** Height of the point on the avatar the camera aims at. */
export const THIRD_PERSON_TARGET_HEIGHT = 1.15;

/**
 * Gap kept between the camera and the wall.
 *
 * Without it the camera sits exactly on the wall plane, so the near plane clips
 * through it and the visitor sees the void behind the hall.
 */
export const CAMERA_WALL_MARGIN = 0.45;

/**
 * Orbit limits, in radians above the horizon.
 *
 * Never below the horizon: an under-floor camera looks through the hall. Never
 * fully overhead either, or the avatar becomes a dot and the hall reads as a
 * map rather than a place.
 */
export const ORBIT_MIN_PITCH = 0.12;
export const ORBIT_MAX_PITCH = 0.92;

/** Standing height of the avatar, in metres. Used to build the model. */
export const AVATAR_HEIGHT = 1.72;

/** Radians per second the avatar turns to face its walking direction. */
export const TURN_SPEED = 9;

/**
 * Wraps an angle into (-PI, PI] so yaw never grows without bound.
 *
 * @param {number} radians
 * @returns {number}
 */
export function normalizeYaw(radians) {
  const value = Number(radians);
  if (!Number.isFinite(value)) return 0;

  const twoPi = Math.PI * 2;
  let wrapped = value % twoPi;
  if (wrapped > Math.PI) wrapped -= twoPi;
  if (wrapped <= -Math.PI) wrapped += twoPi;
  return wrapped;
}

/**
 * Clamps pitch so the visitor cannot look past straight up or straight down.
 *
 * @param {number} radians
 * @returns {number}
 */
export function clampPitch(radians) {
  const value = Number(radians);
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_PITCH, Math.max(MIN_PITCH, value));
}

/**
 * Keeps a position inside the walkable floor.
 *
 * @param {{x: number, z: number}} position
 * @param {number} [half] Half-extent of the walkable area.
 * @returns {{x: number, z: number}}
 */
export function clampToRoom(position, half = WALK_HALF_EXTENT) {
  const x = Number(position?.x);
  const z = Number(position?.z);
  const limit = Number.isFinite(half) && half > 0 ? half : WALK_HALF_EXTENT;

  return {
    x: Math.min(limit, Math.max(-limit, Number.isFinite(x) ? x : 0)),
    z: Math.min(limit, Math.max(-limit, Number.isFinite(z) ? z : 0)),
  };
}

/**
 * Converts a set of held inputs into a unit-length ground direction.
 *
 * Normalising matters: without it, holding W+D would move the visitor
 * sqrt(2) times faster than holding W alone.
 *
 * @param {number} yaw Camera yaw in radians.
 * @param {object} input
 * @param {boolean} [input.forward]
 * @param {boolean} [input.backward]
 * @param {boolean} [input.left]
 * @param {boolean} [input.right]
 * @returns {{x: number, z: number}} Direction, zero-length when idle.
 */
export function moveVector(yaw, input = {}) {
  const forwardAmount = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
  const strafeAmount = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  if (forwardAmount === 0 && strafeAmount === 0) return { x: 0, z: 0 };

  const angle = Number.isFinite(Number(yaw)) ? Number(yaw) : 0;
  // Camera forward at yaw 0 is (0, 0, -1); right is (1, 0, 0).
  const forward = { x: -Math.sin(angle), z: -Math.cos(angle) };
  const right = { x: Math.cos(angle), z: -Math.sin(angle) };

  const x = forward.x * forwardAmount + right.x * strafeAmount;
  const z = forward.z * forwardAmount + right.z * strafeAmount;
  const length = Math.hypot(x, z);

  if (length === 0) return { x: 0, z: 0 };

  return { x: x / length, z: z / length };
}

/**
 * Advances the visitor by one animation frame.
 *
 * The delta is clamped so a backgrounded tab that resumes after seconds does
 * not teleport the camera across the room.
 *
 * @param {{x: number, z: number}} position
 * @param {object} input See `moveVector`.
 * @param {object} params
 * @param {number} params.yaw
 * @param {number} params.delta Seconds since the previous frame.
 * @param {number} [params.speed]
 * @param {number} [params.half]
 * @returns {{x: number, z: number}} Next position, always inside the room.
 */
export function stepPosition(position, input, { yaw, delta, speed = WALK_SPEED, half } = {}) {
  const safeDelta = Number.isFinite(delta) ? Math.min(Math.max(delta, 0), 0.1) : 0;
  const direction = moveVector(yaw, input);
  const distance = (Number.isFinite(speed) ? speed : WALK_SPEED) * safeDelta;

  const current = clampToRoom(position, half);

  return clampToRoom(
    {
      x: current.x + direction.x * distance,
      z: current.z + direction.z * distance,
    },
    half
  );
}

/**
 * Ground distance between two points, ignoring height.
 *
 * @param {{x: number, z: number}} a
 * @param {{x: number, z: number}} b
 * @returns {number}
 */
export function distance2D(a, b) {
  const ax = Number(a?.x);
  const az = Number(a?.z);
  const bx = Number(b?.x);
  const bz = Number(b?.z);

  if (![ax, az, bx, bz].every(Number.isFinite)) return Infinity;
  return Math.hypot(ax - bx, az - bz);
}

/**
 * Finds the closest inspectable car within reach of the visitor.
 *
 * @param {{x: number, z: number}} position
 * @param {Array<{carId: string, position: {x: number, z: number}}>} anchors
 * @param {number} [maxDistance]
 * @returns {{carId: string, distance: number}|null}
 */
export function findNearestCar(position, anchors, maxDistance = INTERACT_DISTANCE) {
  if (!Array.isArray(anchors) || anchors.length === 0) return null;

  const limit = Number.isFinite(maxDistance) ? maxDistance : INTERACT_DISTANCE;
  let best = null;

  for (const anchor of anchors) {
    if (!anchor || !anchor.carId) continue;
    const distance = distance2D(position, anchor.position);
    if (distance > limit) continue;
    if (!best || distance < best.distance) {
      best = { carId: anchor.carId, distance };
    }
  }

  return best;
}

/**
 * Maps a keyboard event code onto a movement input name.
 * Extracted so the key map is testable and stays in one place.
 *
 * @param {string} code `KeyboardEvent.code`
 * @returns {'forward'|'backward'|'left'|'right'|null}
 */
export function movementKeyFromCode(code) {
  switch (code) {
    case 'KeyW':
    case 'ArrowUp':
      return 'forward';
    case 'KeyS':
    case 'ArrowDown':
      return 'backward';
    case 'KeyA':
    case 'ArrowLeft':
      return 'left';
    case 'KeyD':
    case 'ArrowRight':
      return 'right';
    default:
      return null;
  }
}

/**
 * Clamps the orbit pitch into the third-person range.
 *
 * Separate from `clampPitch`, which governs the first-person head tilt: the two
 * modes have different safe ranges, and sharing one would force the stricter
 * limit on both.
 *
 * @param {number} radians
 * @returns {number}
 */
export function clampOrbitPitch(radians) {
  const value = Number(radians);
  if (!Number.isFinite(value)) return ORBIT_MIN_PITCH + 0.3;
  return Math.min(ORBIT_MAX_PITCH, Math.max(ORBIT_MIN_PITCH, value));
}

/**
 * Computes where the third-person camera stands for a given avatar and orbit.
 *
 * The camera sits *behind* the avatar along the yaw direction: with yaw 0 the
 * avatar walks toward -Z, so the camera must be at +Z relative to it. Getting
 * this sign wrong puts the camera in front of the visitor's face, which is the
 * single most common way a third-person rig ships broken.
 *
 * Wall handling shortens the boom instead of sliding the camera along the wall.
 * Sliding is what a naive per-axis clamp does, and it swings the view sideways
 * the moment the avatar backs into a corner — the hall appears to rotate on its
 * own. Shortening the boom leaves the orbit angle untouched: the camera simply
 * comes closer, exactly as a real third-person game does. Only the horizontal
 * reach is shortened, so the camera rises *relative* to its distance and ends up
 * looking over the avatar's head rather than dropping to floor level.
 *
 * Two cases survive the boom shortening, because it can only shorten travel
 * *along* an axis: an axis the boom does not move along (the camera inherits the
 * avatar's x while the avatar hugs the x wall) and an avatar standing exactly on
 * the wall plane. A final clamp of the camera *position* covers both. It only
 * ever pushes the camera inward, so it cannot rotate the view the way the old
 * per-axis slide did — and the avatar/target are left untouched.
 *
 * @param {{x: number, z: number}} avatar Ground position of the avatar.
 * @param {number} yaw Camera yaw, in radians (0 looks down -Z).
 * @param {number} pitch Orbit elevation in radians.
 * @param {object} [options]
 * @param {number} [options.distance]
 * @param {number} [options.half] Walkable half-extent, used for the wall clamp.
 * @returns {{position: {x: number, y: number, z: number}, target: {x: number, y: number, z: number}}}
 */
export function thirdPersonCamera(avatar, yaw, pitch, options = {}) {
  const ax = Number(avatar?.x);
  const az = Number(avatar?.z);
  const originX = Number.isFinite(ax) ? ax : 0;
  const originZ = Number.isFinite(az) ? az : 0;

  const angle = Number.isFinite(Number(yaw)) ? Number(yaw) : 0;
  const elevation = clampOrbitPitch(pitch);

  const distance = Number.isFinite(options.distance) && options.distance > 0
    ? options.distance
    : THIRD_PERSON_DISTANCE;
  const half = Number.isFinite(options.half) && options.half > 0 ? options.half : WALK_HALF_EXTENT;

  // Behind the avatar: opposite the forward vector (-sin yaw, -cos yaw).
  const behindX = Math.sin(angle);
  const behindZ = Math.cos(angle);

  // Horizontal reach shrinks as the camera rises, so the orbit is a sphere
  // segment rather than a cylinder: looking down must not keep the camera as
  // far out as looking level, or the hall is seen from outside the walls.
  const reach = Math.cos(elevation) * distance;

  // How much of the boom fits before it would leave the room, per axis.
  const limit = Math.max(0, half - CAMERA_WALL_MARGIN);
  let scale = 1;

  if (Math.abs(behindX * reach) > 1e-9) {
    const room = (behindX > 0 ? limit - originX : -limit - originX) / (behindX * reach);
    if (room < scale) scale = Math.max(0, room);
  }
  if (Math.abs(behindZ * reach) > 1e-9) {
    const room = (behindZ > 0 ? limit - originZ : -limit - originZ) / (behindZ * reach);
    if (room < scale) scale = Math.max(0, room);
  }

  const horizontal = reach * scale;
  const vertical = Math.sin(elevation) * distance;

  // See the note above: a no-op in the normal wall case, an inward nudge when
  // the avatar itself is pressed against (or standing on) a wall.
  const clampAxis = (value) => Math.min(limit, Math.max(-limit, value));

  return {
    position: {
      x: clampAxis(originX + behindX * horizontal),
      y: THIRD_PERSON_TARGET_HEIGHT + vertical,
      z: clampAxis(originZ + behindZ * horizontal),
    },
    target: { x: originX, y: THIRD_PERSON_TARGET_HEIGHT, z: originZ },
  };
}

/**
 * Turns an avatar toward a direction at a bounded rate.
 *
 * Snapping the avatar to the input direction makes it look like the model is
 * being teleported between poses; easing it reads as a body turning. The
 * shortest-arc handling matters because a naive lerp between 3.1 and -3.1 rad
 * spins the avatar almost all the way around for a two-degree correction.
 *
 * @param {number} current Current yaw in radians.
 * @param {number} desired Desired yaw in radians.
 * @param {number} delta Seconds since the previous frame.
 * @param {number} [speed] Radians per second.
 * @returns {number} The new yaw.
 */
export function turnToward(current, desired, delta, speed = TURN_SPEED) {
  const from = Number.isFinite(Number(current)) ? Number(current) : 0;
  const to = Number.isFinite(Number(desired)) ? Number(desired) : 0;
  const step = (Number.isFinite(speed) ? Math.max(0, speed) : TURN_SPEED) *
    (Number.isFinite(delta) ? Math.min(Math.max(delta, 0), 0.1) : 0);

  if (step === 0) return normalizeYaw(from);

  const difference = normalizeYaw(to - from);
  if (Math.abs(difference) <= step) return normalizeYaw(to);

  return normalizeYaw(from + Math.sign(difference) * step);
}

/**
 * Converts a ground movement direction into the yaw that faces it.
 *
 * Inverse of the forward vector in `moveVector`: forward is (-sin, -cos), so a
 * direction (x, z) is faced by atan2(-x, -z).
 *
 * @param {{x: number, z: number}} direction
 * @returns {number|null} Yaw in radians, or null when the direction is zero.
 */
export function yawFromDirection(direction) {
  const x = Number(direction?.x);
  const z = Number(direction?.z);

  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  if (Math.abs(x) < 1e-9 && Math.abs(z) < 1e-9) return null;

  return normalizeYaw(Math.atan2(-x, -z));
}

/**
 * How far the camera may zoom out, in metres.
 *
 * Expressed as a function rather than a constant because the ceiling is what
 * matters: pulling back further than this puts the camera outside the hall.
 *
 * @param {number} [half] Walkable half-extent.
 * @returns {number}
 */
export function maxOrbitDistance(half = WALK_HALF_EXTENT) {
  const extent = Number.isFinite(half) && half > 0 ? half : WALK_HALF_EXTENT;
  return Math.max(THIRD_PERSON_DISTANCE, extent * 1.1);
}

