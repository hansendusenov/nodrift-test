import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AVATAR_HEIGHT,
  CAMERA_WALL_MARGIN,
  EYE_HEIGHT,
  INTERACT_DISTANCE,
  MAX_PITCH,
  MIN_PITCH,
  ORBIT_MAX_PITCH,
  ORBIT_MIN_PITCH,
  THIRD_PERSON_DISTANCE,
  THIRD_PERSON_TARGET_HEIGHT,
  TURN_SPEED,
  WALK_HALF_EXTENT,
  WALK_SPEED,
  clampOrbitPitch,
  clampPitch,
  clampToRoom,
  distance2D,
  findNearestCar,
  maxOrbitDistance,
  moveVector,
  movementKeyFromCode,
  normalizeYaw,
  stepPosition,
  thirdPersonCamera,
  turnToward,
  yawFromDirection,
} from './showroomNavigation.js';

const near = (actual, expected, tolerance = 1e-9) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );

describe('domain: showroomNavigation - normalizeYaw', () => {
  it('keeps angles already inside the range', () => {
    near(normalizeYaw(0), 0);
    near(normalizeYaw(1), 1);
    near(normalizeYaw(-1), -1);
  });

  it('wraps past half a turn back into range', () => {
    near(normalizeYaw(Math.PI * 2), 0, 1e-12);
    near(normalizeYaw(Math.PI * 2 + 0.5), 0.5, 1e-12);
    near(normalizeYaw(-Math.PI * 2 - 0.5), -0.5, 1e-12);
  });

  it('returns zero for non-finite input instead of NaN', () => {
    assert.equal(normalizeYaw(NaN), 0);
    assert.equal(normalizeYaw(Infinity), 0);
    assert.equal(normalizeYaw(undefined), 0);
  });
});

describe('domain: showroomNavigation - clampPitch', () => {
  it('clamps to the configured limits', () => {
    assert.equal(clampPitch(10), MAX_PITCH);
    assert.equal(clampPitch(-10), MIN_PITCH);
  });

  it('leaves values inside the range untouched', () => {
    near(clampPitch(0.2), 0.2);
  });

  it('returns zero for non-finite input', () => {
    assert.equal(clampPitch(NaN), 0);
  });
});

describe('domain: showroomNavigation - clampToRoom', () => {
  it('leaves a position inside the room alone', () => {
    assert.deepEqual(clampToRoom({ x: 1, z: -2 }), { x: 1, z: -2 });
  });

  it('pulls an escaping position back to the wall', () => {
    assert.deepEqual(clampToRoom({ x: 100, z: -100 }), {
      x: WALK_HALF_EXTENT,
      z: -WALK_HALF_EXTENT,
    });
  });

  it('accepts a custom half-extent', () => {
    assert.deepEqual(clampToRoom({ x: 50, z: 0 }, 2), { x: 2, z: 0 });
  });

  it('survives a malformed position', () => {
    assert.deepEqual(clampToRoom(undefined), { x: 0, z: 0 });
    assert.deepEqual(clampToRoom({ x: 'a', z: null }), { x: 0, z: 0 });
  });
});

describe('domain: showroomNavigation - moveVector', () => {
  it('returns a zero vector when nothing is held', () => {
    assert.deepEqual(moveVector(0, {}), { x: 0, z: 0 });
  });

  it('moves toward -Z when walking forward at yaw 0', () => {
    const v = moveVector(0, { forward: true });
    near(v.x, 0);
    near(v.z, -1);
  });

  it('moves toward +Z when walking backward at yaw 0', () => {
    const v = moveVector(0, { backward: true });
    near(v.z, 1);
  });

  it('strafes along +X when holding right at yaw 0', () => {
    const v = moveVector(0, { right: true });
    near(v.x, 1);
    near(v.z, 0);
  });

  it('cancels opposing inputs', () => {
    assert.deepEqual(moveVector(0, { forward: true, backward: true }), { x: 0, z: 0 });
    assert.deepEqual(moveVector(0, { left: true, right: true }), { x: 0, z: 0 });
  });

  it('normalises diagonal movement so it is not faster', () => {
    const diagonal = moveVector(0, { forward: true, right: true });
    near(Math.hypot(diagonal.x, diagonal.z), 1);
  });

  it('turns the walk direction with the camera', () => {
    // Yaw of +90deg turns the camera to face -X
    const v = moveVector(Math.PI / 2, { forward: true });
    near(v.x, -1);
    near(v.z, 0);
  });

  it('treats a non-finite yaw as zero', () => {
    const v = moveVector(NaN, { forward: true });
    near(v.z, -1);
  });
});

describe('domain: showroomNavigation - stepPosition', () => {
  it('advances by speed multiplied by delta', () => {
    const next = stepPosition({ x: 0, z: 0 }, { forward: true }, { yaw: 0, delta: 0.05 });
    near(next.z, -WALK_SPEED * 0.05, 1e-9);
  });

  it('caps a long frame at the maximum step, not the requested delta', () => {
    // A 0.5s frame is still capped to 0.1s of travel
    const next = stepPosition({ x: 0, z: 0 }, { forward: true }, { yaw: 0, delta: 0.5 });
    near(next.z, -WALK_SPEED * 0.1, 1e-9);
  });

  it('never leaves the room', () => {
    const next = stepPosition({ x: 0, z: -WALK_HALF_EXTENT + 0.01 }, { forward: true }, {
      yaw: 0,
      delta: 1,
    });
    assert.equal(next.z, -WALK_HALF_EXTENT);
  });

  it('clamps a huge delta so a resumed tab does not teleport', () => {
    const next = stepPosition({ x: 0, z: 0 }, { forward: true }, { yaw: 0, delta: 30 });
    // The step is capped at 0.1s worth of travel
    near(next.z, -WALK_SPEED * 0.1, 1e-9);
  });

  it('does not move when no key is held', () => {
    const next = stepPosition({ x: 1, z: 1 }, {}, { yaw: 0, delta: 0.1 });
    assert.deepEqual(next, { x: 1, z: 1 });
  });

  it('ignores a negative or non-finite delta', () => {
    assert.deepEqual(stepPosition({ x: 0, z: 0 }, { forward: true }, { yaw: 0, delta: -1 }), {
      x: 0,
      z: 0,
    });
    assert.deepEqual(stepPosition({ x: 0, z: 0 }, { forward: true }, { yaw: 0, delta: NaN }), {
      x: 0,
      z: 0,
    });
  });
});

describe('domain: showroomNavigation - distance2D', () => {
  it('measures ground distance and ignores height', () => {
    assert.equal(distance2D({ x: 0, z: 0 }, { x: 3, z: 4 }), 5);
  });

  it('returns Infinity for malformed points', () => {
    assert.equal(distance2D(null, { x: 0, z: 0 }), Infinity);
    assert.equal(distance2D({ x: 0, z: 0 }, { x: 'a', z: 1 }), Infinity);
  });
});

describe('domain: showroomNavigation - findNearestCar', () => {
  const anchors = [
    { carId: 'a', position: { x: 0, z: 0 } },
    { carId: 'b', position: { x: 2, z: 0 } },
    { carId: 'c', position: { x: 20, z: 0 } },
  ];

  it('returns the closest anchor inside the radius', () => {
    const nearest = findNearestCar({ x: 1.5, z: 0 }, anchors);
    assert.equal(nearest.carId, 'b');
    assert.equal(nearest.distance, 0.5);
  });

  it('returns null when every anchor is out of reach', () => {
    assert.equal(findNearestCar({ x: 100, z: 100 }, anchors), null);
  });

  it('returns null for an empty or malformed anchor list', () => {
    assert.equal(findNearestCar({ x: 0, z: 0 }, []), null);
    assert.equal(findNearestCar({ x: 0, z: 0 }, null), null);
  });

  it('skips anchors without a car id', () => {
    const nearest = findNearestCar({ x: 0, z: 0 }, [
      { position: { x: 0, z: 0 } },
      { carId: 'real', position: { x: 1, z: 0 } },
    ]);
    assert.equal(nearest.carId, 'real');
  });

  it('honours a custom interaction radius', () => {
    // "a" sits at the origin, so a 0.5m radius still reaches it
    assert.equal(findNearestCar({ x: 0, z: 0 }, anchors, 0.5).carId, 'a');
    // But a radius of zero reaches nothing
    assert.equal(findNearestCar({ x: 0, z: 0 }, anchors, -1), null);
    assert.equal(findNearestCar({ x: 0.4, z: 0 }, anchors, 0.3), null);
    assert.equal(findNearestCar({ x: 0.4, z: 0 }, anchors, 0.5).carId, 'a');
  });

  it('never reports a distance beyond INTERACT_DISTANCE by default', () => {
    const nearest = findNearestCar({ x: 0, z: 0 }, anchors);
    assert.ok(nearest.distance <= INTERACT_DISTANCE);
  });
});

describe('domain: showroomNavigation - movementKeyFromCode', () => {
  it('maps WASD and the arrow keys to movement', () => {
    assert.equal(movementKeyFromCode('KeyW'), 'forward');
    assert.equal(movementKeyFromCode('ArrowUp'), 'forward');
    assert.equal(movementKeyFromCode('KeyS'), 'backward');
    assert.equal(movementKeyFromCode('ArrowDown'), 'backward');
    assert.equal(movementKeyFromCode('KeyA'), 'left');
    assert.equal(movementKeyFromCode('ArrowLeft'), 'left');
    assert.equal(movementKeyFromCode('KeyD'), 'right');
    assert.equal(movementKeyFromCode('ArrowRight'), 'right');
  });

  it('ignores every other key so typing cannot move the visitor', () => {
    assert.equal(movementKeyFromCode('KeyE'), null);
    assert.equal(movementKeyFromCode('Space'), null);
    assert.equal(movementKeyFromCode(undefined), null);
  });
});

describe('domain: showroomNavigation - constants', () => {
  it('keeps the eye height in a believable human range', () => {
    assert.ok(EYE_HEIGHT > 1.4 && EYE_HEIGHT < 1.9);
  });

  it('keeps the interaction distance smaller than the room', () => {
    assert.ok(INTERACT_DISTANCE < WALK_HALF_EXTENT);
  });

  it('gives the avatar a human height', () => {
    assert.ok(AVATAR_HEIGHT > 1.5 && AVATAR_HEIGHT < 2);
    assert.ok(AVATAR_HEIGHT > THIRD_PERSON_TARGET_HEIGHT, 'the camera must aim below the head');
  });
});

describe('domain: showroomNavigation - clampOrbitPitch', () => {
  it('clamps into the third-person orbit range', () => {
    assert.equal(clampOrbitPitch(10), ORBIT_MAX_PITCH);
    assert.equal(clampOrbitPitch(-10), ORBIT_MIN_PITCH);
  });

  it('never lets the camera drop below the horizon', () => {
    assert.ok(ORBIT_MIN_PITCH > 0, 'an under-floor camera would look through the hall');
    assert.ok(clampOrbitPitch(-0.5) > 0);
  });

  it('returns a usable default for non-finite input', () => {
    const value = clampOrbitPitch(NaN);
    assert.ok(value >= ORBIT_MIN_PITCH && value <= ORBIT_MAX_PITCH);
  });
});

describe('domain: showroomNavigation - thirdPersonCamera', () => {
  const avatar = { x: 0, z: 0 };

  it('stands behind the avatar, not in front of it', () => {
    // Yaw 0 walks toward -Z, so "behind" is +Z
    const { position } = thirdPersonCamera(avatar, 0, 0.4);
    assert.ok(position.z > 0, `camera z=${position.z} should be positive (behind)`);
    near(position.x, 0);
  });

  it('follows the avatar when it turns', () => {
    // Facing -X (yaw +90deg) means the camera sits at +X
    const { position } = thirdPersonCamera(avatar, Math.PI / 2, 0.4);
    assert.ok(position.x > 0, `camera x=${position.x} should be positive`);
    near(position.z, 0, 1e-9);
  });

  it('aims at the avatar body, not at the floor', () => {
    const { target } = thirdPersonCamera(avatar, 0, 0.4);
    near(target.y, THIRD_PERSON_TARGET_HEIGHT);
    near(target.x, 0);
    near(target.z, 0);
  });

  it('rises and closes in as the pitch increases', () => {
    const low = thirdPersonCamera(avatar, 0, ORBIT_MIN_PITCH);
    const high = thirdPersonCamera(avatar, 0, ORBIT_MAX_PITCH);

    assert.ok(high.position.y > low.position.y, 'higher pitch must raise the camera');
    assert.ok(
      Math.abs(high.position.z) < Math.abs(low.position.z),
      'higher pitch must pull the camera closer horizontally'
    );
  });

  it('keeps the camera inside the walls', () => {
    const far = { x: WALK_HALF_EXTENT, z: WALK_HALF_EXTENT };
    const { position } = thirdPersonCamera(far, Math.PI, 0.3);

    assert.ok(Math.abs(position.x) <= WALK_HALF_EXTENT - CAMERA_WALL_MARGIN + 1e-9);
    assert.ok(Math.abs(position.z) <= WALK_HALF_EXTENT - CAMERA_WALL_MARGIN + 1e-9);
  });

  it('does not move the avatar when the camera hits a wall', () => {
    const corner = { x: WALK_HALF_EXTENT - 0.1, z: WALK_HALF_EXTENT - 0.1 };
    const { target } = thirdPersonCamera(corner, 0, 0.3);

    near(target.x, corner.x);
    near(target.z, corner.z);
  });

  it('shortens the boom without swinging the view when backed into a wall', () => {
    // Regression guard: a per-axis clamp slides the camera sideways along the
    // wall, so the hall appears to rotate on its own as the visitor backs up.
    const backed = { x: 0, z: WALK_HALF_EXTENT - 0.2 };
    const free = { x: 0, z: 0 };
    const yaw = 0;

    const tight = thirdPersonCamera(backed, yaw, 0.42);
    const loose = thirdPersonCamera(free, yaw, 0.42);

    // Same bearing relative to the avatar: straight behind, no sideways drift
    near(tight.position.x - backed.x, 0);
    near(loose.position.x - free.x, 0);
    // But a shorter boom
    assert.ok(
      Math.abs(tight.position.z - backed.z) < Math.abs(loose.position.z - free.z),
      'the boom must shorten near the wall'
    );
    // And it rises relative to its distance, so it looks over the avatar
    const tightPitch = (tight.position.y - THIRD_PERSON_TARGET_HEIGHT) /
      Math.abs(tight.position.z - backed.z);
    const loosePitch = (loose.position.y - THIRD_PERSON_TARGET_HEIGHT) /
      Math.abs(loose.position.z - free.z);
    assert.ok(tightPitch > loosePitch, 'the clamped camera must look down more steeply');
  });

  it('honours a custom distance', () => {
    const near1 = thirdPersonCamera(avatar, 0, 0.4, { distance: 2 });
    const far = thirdPersonCamera(avatar, 0, 0.4, { distance: 6 });

    assert.ok(Math.abs(far.position.z) > Math.abs(near1.position.z));
  });

  it('survives a malformed avatar and pitch', () => {
    const { position, target } = thirdPersonCamera(undefined, NaN, NaN);

    assert.ok([position.x, position.y, position.z].every(Number.isFinite));
    assert.ok([target.x, target.y, target.z].every(Number.isFinite));
  });
});

describe('domain: showroomNavigation - turnToward', () => {
  it('snaps when the remaining angle is inside one step', () => {
    near(turnToward(0, 0.05, 0.1), 0.05);
  });

  it('turns at the configured rate', () => {
    const next = turnToward(0, Math.PI / 2, 0.1, TURN_SPEED);
    near(next, TURN_SPEED * 0.1);
  });

  it('takes the short way around the wrap point', () => {
    // 3.1 -> -3.1 is a 0.083 rad correction, not almost a full turn
    const next = turnToward(3.1, -3.1, 0.1, 100);
    assert.ok(Math.abs(next + 3.1) < 1e-9, `got ${next}, expected to land on -3.1`);
  });

  it('does not move without a delta', () => {
    near(turnToward(1, 2, 0), 1);
    near(turnToward(1, 2, NaN), 1);
  });

  it('survives non-finite input', () => {
    assert.ok(Number.isFinite(turnToward(NaN, NaN, 0.016)));
  });
});

describe('domain: showroomNavigation - yawFromDirection', () => {
  it('faces -Z for a forward direction', () => {
    near(yawFromDirection({ x: 0, z: -1 }), 0);
  });

  it('faces +Z when walking backward', () => {
    near(Math.abs(yawFromDirection({ x: 0, z: 1 })), Math.PI);
  });

  it('faces +X when strafing right at yaw 0', () => {
    // moveVector right at yaw 0 is (1, 0); the yaw that walks toward +X is -PI/2
    near(yawFromDirection({ x: 1, z: 0 }), -Math.PI / 2);
  });

  it('is the inverse of the moveVector forward direction', () => {
    for (const yaw of [-2.4, -0.6, 0, 0.7, 1.9, 3]) {
      const direction = moveVector(yaw, { forward: true });
      const recovered = yawFromDirection(direction);
      assert.ok(
        Math.abs(normalizeYaw(recovered - yaw)) < 1e-9,
        `yaw ${yaw} recovered as ${recovered}`
      );
    }
  });

  it('returns null for a zero or malformed direction', () => {
    assert.equal(yawFromDirection({ x: 0, z: 0 }), null);
    assert.equal(yawFromDirection(undefined), null);
    assert.equal(yawFromDirection({ x: 'a', z: 1 }), null);
  });
});

describe('domain: showroomNavigation - maxOrbitDistance', () => {
  it('allows zooming out past the default framing', () => {
    assert.ok(maxOrbitDistance() > THIRD_PERSON_DISTANCE);
  });

  it('scales with the room and stays finite for bad input', () => {
    assert.ok(maxOrbitDistance(20) > maxOrbitDistance(10));
    assert.ok(Number.isFinite(maxOrbitDistance(NaN)));
  });
});

