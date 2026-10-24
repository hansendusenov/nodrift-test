import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOOR_STYLE,
  PEDESTAL_RADIUS,
  RING_RADIUS,
  buildShowroomLayout,
  getSpawnPoint,
  getThirdPersonSpawn,
  hasClearSpawn,
  pedestalsHaveGap,
  ringSlot,
} from './showroomLayout.js';
import {
  INTERACT_DISTANCE,
  THIRD_PERSON_DISTANCE,
  WALK_HALF_EXTENT,
  distance2D,
  thirdPersonCamera,
} from '../domain/showroomNavigation.js';

const cars = [
  { id: 'a', name: 'Car A' },
  { id: 'b', name: 'Car B' },
  { id: 'c', name: 'Car C' },
];

describe('data: showroomLayout - ringSlot', () => {
  it('places the first slot at the front of the hall', () => {
    const slot = ringSlot(0, 4);
    // RING_START_ANGLE is offset from -PI/2 so no car blocks the entrance
    assert.ok(Math.abs(Math.hypot(slot.x, slot.z) - RING_RADIUS) < 1e-9);
    assert.ok(slot.z < 0, 'first slot sits on the far half of the ring');
  });

  it('spaces slots evenly around the ring', () => {
    const total = 6;
    const positions = Array.from({ length: total }, (_, i) => ringSlot(i, total));
    for (const position of positions) {
      assert.ok(Math.abs(Math.hypot(position.x, position.z) - RING_RADIUS) < 1e-9);
    }
    // Adjacent slots are one sixth of a turn apart
    const expectedChord = 2 * RING_RADIUS * Math.sin(Math.PI / total);
    for (let i = 1; i < positions.length; i += 1) {
      const chord = distance2D(positions[i - 1], positions[i]);
      assert.ok(Math.abs(chord - expectedChord) < 1e-9);
    }
  });

  it('survives a zero or malformed total', () => {
    const slot = ringSlot(0, 0);
    assert.ok(Number.isFinite(slot.x));
    assert.ok(Number.isFinite(slot.z));
  });

  it('accepts a custom radius', () => {
    const slot = ringSlot(0, 4, 2);
    assert.ok(Math.abs(Math.hypot(slot.x, slot.z) - 2) < 1e-9);
  });
});

describe('data: showroomLayout - buildShowroomLayout', () => {
  it('returns one slot per car, in fleet order', () => {
    const layout = buildShowroomLayout(cars);
    assert.equal(layout.length, 3);
    assert.deepEqual(layout.map((slot) => slot.carId), ['a', 'b', 'c']);
    assert.deepEqual(layout.map((slot) => slot.slot), [0, 1, 2]);
  });

  it('carries the display name through', () => {
    assert.equal(buildShowroomLayout(cars)[0].name, 'Car A');
  });

  it('keeps every car inside the walkable room', () => {
    const layout = buildShowroomLayout(cars);
    for (const slot of layout) {
      assert.ok(Math.abs(slot.position.x) <= WALK_HALF_EXTENT);
      assert.ok(Math.abs(slot.position.z) <= WALK_HALF_EXTENT);
    }
  });

  it('turns each car so its nose faces the walkway', () => {
    const layout = buildShowroomLayout(cars);

    for (const slot of layout) {
      // A Y rotation of t maps the model's nose (local +Z) to (sin t, cos t).
      // Cars stand on a ring facing the visitor's path at the wall, so the
      // nose must point away from the centre, not into it.
      const nose = { x: Math.sin(slot.rotationY), z: Math.cos(slot.rotationY) };
      const outwardLength = Math.hypot(slot.position.x, slot.position.z);
      const outward = {
        x: slot.position.x / outwardLength,
        z: slot.position.z / outwardLength,
      };

      const dot = nose.x * outward.x + nose.z * outward.z;
      assert.ok(dot > 0.999, `slot ${slot.carId} faces the wrong way (dot=${dot})`);
    }
  });

  it('returns an empty plan for an empty or malformed fleet', () => {
    assert.deepEqual(buildShowroomLayout([]), []);
    assert.deepEqual(buildShowroomLayout(null), []);
    assert.deepEqual(buildShowroomLayout([null, { name: 'no id' }]), []);
  });
});

describe('data: showroomLayout - getSpawnPoint', () => {
  it('starts the visitor inside the room', () => {
    const spawn = getSpawnPoint();
    assert.ok(Math.abs(spawn.x) < WALK_HALF_EXTENT);
    assert.ok(Math.abs(spawn.z) < WALK_HALF_EXTENT);
  });

  it('faces the visitor toward the hall interior', () => {
    // Yaw 0 looks down -Z, and the spawn sits at positive Z
    assert.equal(getSpawnPoint().yaw, 0);
  });

  it('returns a fresh object each call so callers cannot mutate the spawn', () => {
    const first = getSpawnPoint();
    first.x = 999;
    assert.notEqual(getSpawnPoint().x, 999);
  });
});

describe('data: showroomLayout - getThirdPersonSpawn', () => {
  it('starts the avatar inside the room', () => {
    const spawn = getThirdPersonSpawn();
    assert.ok(Math.abs(spawn.x) < WALK_HALF_EXTENT);
    assert.ok(Math.abs(spawn.z) < WALK_HALF_EXTENT);
  });

  it('keeps every car outside the interaction radius, whatever the fleet size', () => {
    for (const count of [1, 2, 3, 4, 5, 6, 8, 10]) {
      const spawn = getThirdPersonSpawn();
      const layout = buildShowroomLayout(
        Array.from({ length: count }, (_, i) => ({ id: `car-${i}`, name: `Car ${i}` }))
      );
      for (const slot of layout) {
        assert.ok(
          distance2D(spawn, slot.position) > INTERACT_DISTANCE,
          `fleet of ${count}: a car starts inside the interaction radius`
        );
      }
    }
  });

  it('leaves the follow camera a full boom instead of clamping it onto the avatar', () => {
    // Regression: spawning at the entrance wall cut the boom to ~0.45 m, so the
    // camera pitched nearly straight down onto the avatar's head.
    const spawn = getThirdPersonSpawn();
    const { position } = thirdPersonCamera(spawn, spawn.yaw, 0.42);
    const horizontal = Math.hypot(position.x - spawn.x, position.z - spawn.z);
    // The boom tilts with the pitch, so compare against the full reach rather
    // than the flat distance.
    assert.ok(
      horizontal > THIRD_PERSON_DISTANCE * 0.85,
      `the follow camera's boom was clamped to ${horizontal.toFixed(2)} m`
    );
  });

  it('returns a fresh object each call so callers cannot mutate the spawn', () => {
    const first = getThirdPersonSpawn();
    first.x = 999;
    assert.notEqual(getThirdPersonSpawn().x, 999);
  });
});

describe('data: showroomLayout - pedestalsHaveGap', () => {
  it('leaves a real gap between neighbours for a full fleet', () => {
    // Regression: radius 2.35 on a 4.6 ring overlapped by 10 cm and drew a
    // dark X across the floor where the discs intersected.
    for (const count of [2, 3, 4, 5, 6]) {
      assert.ok(pedestalsHaveGap(count), `pedestals overlap with ${count} cars`);
    }
  });

  it('reports overlap when the ring is too crowded', () => {
    // 12 slots on this ring are closer than one diameter apart
    assert.equal(pedestalsHaveGap(12), false);
  });

  it('treats a single car as unconstrained', () => {
    assert.equal(pedestalsHaveGap(1), true);
  });

  it('keeps the pedestal strictly inside half the chord', () => {
    const chord = 2 * RING_RADIUS * Math.sin(Math.PI / 6);
    assert.ok(PEDESTAL_RADIUS * 2 < chord);
  });
});

describe('data: showroomLayout - spawn clearance', () => {
  it('does not drop the visitor nose-to-grille against a car', () => {
    // Regression: the first ring put a car inside the interaction radius at
    // spawn, so it was already highlighted and filled the screen.
    for (const count of [1, 2, 3, 4, 5, 6, 8, 10]) {
      const layout = buildShowroomLayout(
        Array.from({ length: count }, (_, i) => ({ id: `car-${i}`, name: `Car ${i}` }))
      );
      assert.ok(hasClearSpawn(layout), `fleet of ${count} blocks the spawn point`);
    }
  });

  it('reports a blocked spawn when a car is placed on the visitor', () => {
    const spawn = getSpawnPoint();
    const layout = [{ position: { x: spawn.x, z: spawn.z - 1 } }];
    assert.equal(hasClearSpawn(layout), false);
  });
});

describe('data: showroomLayout - FLOOR_STYLE', () => {
  it('nests its radii in the order the renderer draws them', () => {
    assert.ok(FLOOR_STYLE.innerRadius < FLOOR_STYLE.ringRadius);
    assert.ok(FLOOR_STYLE.ringRadius < FLOOR_STYLE.outerRadius);
  });

  it('matches the walkable extent so the floor never ends before the wall', () => {
    assert.equal(FLOOR_STYLE.outerRadius, WALK_HALF_EXTENT);
  });
});
