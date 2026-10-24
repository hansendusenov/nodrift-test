/**
 * Showroom floor plan.
 *
 * Adheres to nodrift-standard Section 2: the arrangement of cars in 3D space is
 * data, not markup. Components read positions from here; they never compute
 * them, so the layout can be tested and changed without touching rendering.
 *
 * The plan is a ring of pedestals around a walkable centre. A ring is used
 * because it gives every car the same presence — a row would make the car on
 * the end feel like an afterthought — and because it lets the visitor walk a
 * full circle without hitting an invisible wall.
 */

import { INTERACT_DISTANCE, WALK_HALF_EXTENT } from '../domain/showroomNavigation.js';

/** Radius of the ring on which the cars stand, in metres. */
export const RING_RADIUS = 4.6;

/**
 * Angle of the first slot.
 *
 * Deliberately offset by half a slot from the entrance axis (which is +Z). With
 * the offset, no car sits directly in the visitor's path when the walk starts:
 * the two nearest cars frame the entrance like a gateway instead of one car
 * filling the whole screen at spawn distance. Verified by the layout test.
 */
export const RING_START_ANGLE = -Math.PI / 2 + Math.PI / 6;

/**
 * Radius of one pedestal, in metres.
 *
 * Exported as data because the renderer draws it and the layout tests assert
 * against it; two hardcoded copies would drift apart.
 *
 * Kept strictly below half the chord between neighbouring slots (RING_RADIUS / 2
 * for a six-car ring, i.e. 2.3). At 2.35 the discs overlapped by 10 cm and the
 * intersection seams drew a dark X across the floor.
 */
export const PEDESTAL_RADIUS = 2.15;

/**
 * Computes a pedestal position on the ring.
 *
 * @param {number} index Zero-based slot.
 * @param {number} total Number of slots.
 * @param {number} [radius]
 * @returns {{x: number, z: number, angle: number}}
 */
export function ringSlot(index, total, radius = RING_RADIUS) {
  const count = Number.isFinite(total) && total > 0 ? total : 1;
  const safeIndex = Number.isFinite(index) ? index : 0;
  const safeRadius = Number.isFinite(radius) && radius > 0 ? radius : RING_RADIUS;

  // Even spacing around the ring, starting at the front so the first car is
  // the one the visitor faces when the walk begins.
  const angle = RING_START_ANGLE + (safeIndex / count) * Math.PI * 2;

  return {
    x: Math.cos(angle) * safeRadius,
    z: Math.sin(angle) * safeRadius,
    angle,
  };
}

/**
 * Builds the floor plan for the current fleet.
 *
 * @param {Array<{id: string, name: string}>} cars
 * @returns {Array<{carId: string, name: string, position: {x: number, z: number}, rotationY: number, slot: number}>}
 */
export function buildShowroomLayout(cars = []) {
  const list = Array.isArray(cars) ? cars.filter((car) => car && car.id) : [];
  if (list.length === 0) return [];

  return list.map((car, index) => {
    const slot = ringSlot(index, list.length);

    return {
      carId: car.id,
      name: car.name,
      slot: index,
      position: { x: slot.x, z: slot.z },
      // Face outward, toward the walkway at the edge of the hall.
      //
      // Every Kenney model has its nose along local +Z (verified against the
      // GLB node translations: the front wheels sit at positive Z). A Y
      // rotation of t maps local +Z to (sin t, cos t). The visitor spawns at
      // the wall, so pointing the nose outward means they walk in and see the
      // front of each car; pointing it inward would show them the boot.
      // Outward direction is (cos angle, sin angle), hence t = PI/2 - angle.
      rotationY: Math.PI / 2 - slot.angle,
    };
  });
}

/**
 * Where the visitor starts: just inside the entrance, facing the first car.
 *
 * @returns {{x: number, z: number, yaw: number}}
 */
export function getSpawnPoint() {
  return {
    x: 0,
    // Near the back wall, with enough clearance that no car is already inside
    // the interaction radius (guarded by `hasClearSpawn`).
    z: WALK_HALF_EXTENT - 0.9,
    // Looking toward the centre of the hall, i.e. toward -Z
    yaw: 0,
  };
}

/**
 * Where the third-person avatar starts.
 *
 * The first-person spawn sits just inside the entrance, which is right when the
 * camera *is* the visitor: you stand at the door and look in. A follow camera
 * needs the opposite — a boom's length of clear floor *behind* the body — or the
 * wall clamp cuts the boom to nothing and the camera ends up nose-down over the
 * avatar's head. Spawning at the open centre of the ring gives the camera the
 * whole hall to sit in while still facing a pair of cars.
 *
 * @returns {{x: number, z: number, yaw: number}}
 */
export function getThirdPersonSpawn() {
  return {
    x: 0,
    z: 0,
    // Same heading as the first-person spawn: walk deeper into the hall, with
    // the two nearest cars framing the view ahead of the avatar.
    yaw: 0,
  };
}

/**
 * The three swatches of the hall floor, used by the renderer.
 * Exported as data so the visual language is not hardcoded in JSX.
 */
export const FLOOR_STYLE = Object.freeze({
  innerRadius: 2.2,
  ringRadius: RING_RADIUS,
  outerRadius: WALK_HALF_EXTENT,
});

/**
 * Whether the pedestals overlap each other on the ring.
 *
 * Regression guard: the discs are flat cylinders a few centimetres above the
 * floor, so any overlap produces a visible seam. At RING_RADIUS 4.6 and a
 * pedestal radius of 2.35 they overlapped by 10 cm and drew a dark X across the
 * hall, which looked like a shadow bug.
 *
 * @param {number} count Number of cars on the ring.
 * @returns {boolean} True when there is a real gap between neighbours.
 */
export function pedestalsHaveGap(count) {
  const slots = Number.isFinite(count) && count > 1 ? count : 1;
  if (slots === 1) return true;

  // Chord between two adjacent slots on the ring
  const chord = 2 * RING_RADIUS * Math.sin(Math.PI / slots);
  return chord > PEDESTAL_RADIUS * 2;
}

/**
 * Whether the spawn point is clear of every car's interaction radius.
 *
 * The threshold is the interaction distance, not an arbitrary number: if the
 * visitor starts *inside* the radius, a car is already highlighted before they
 * take a step, which both looks wrong and fills the screen at spawn. The first
 * version of this ring failed exactly that way.
 *
 * @param {Array<{position: {x: number, z: number}}>} layout
 * @param {number} [minDistance]
 * @returns {boolean}
 */
export function hasClearSpawn(layout, minDistance = INTERACT_DISTANCE) {
  const spawn = getSpawnPoint();
  const limit = Number.isFinite(minDistance) ? minDistance : INTERACT_DISTANCE;

  return layout.every((slot) => {
    const dx = slot.position.x - spawn.x;
    const dz = slot.position.z - spawn.z;
    return Math.hypot(dx, dz) > limit;
  });
}
