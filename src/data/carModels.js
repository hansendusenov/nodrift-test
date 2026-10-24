/**
 * 3D showroom asset catalogue.
 *
 * Adheres to nodrift-standard Section 2: the mapping from a fleet car to a 3D
 * model lives in the data layer, never inside a component. Swapping a model
 * later must not require touching rendering code.
 *
 * Asset provenance
 * ----------------
 * Models come from Kenney's Car Kit 3.1, released under CC0 1.0 (public
 * domain). The GLB files are **not** self-contained: each one references
 * `Textures/colormap.png` by relative URI, so the texture must be served from
 * the same relative location. `public/models/Textures/colormap.png` exists for
 * exactly that reason — removing it makes every car render untextured white.
 *
 * These are stylised low-poly models, not the actual vehicles in the fleet.
 * They are matched by silhouette (MPV, SUV, hatchback, luxury) because a
 * licensed model of a Toyota Avanza does not exist in the public domain.
 */

/** Base path of the served models, relative to the site root. */
export const MODEL_BASE_PATH = '/models';

/**
 * Per-model placement metadata.
 *
 * `yawOffset` rotates a model so its nose faces the hall entrance; the kit
 * does not ship every model on the same axis. `scale` normalises the models to
 * comparable real-world lengths so a hatchback does not look like a van.
 */
const MODEL_LIBRARY = Object.freeze({
  van: { file: 'van.glb', scale: 1.05, yawOffset: 0 },
  suv: { file: 'suv.glb', scale: 1, yawOffset: 0 },
  'suv-luxury': { file: 'suv-luxury.glb', scale: 1.05, yawOffset: 0 },
  'hatchback-sports': { file: 'hatchback-sports.glb', scale: 0.95, yawOffset: 0 },
  sedan: { file: 'sedan.glb', scale: 0.95, yawOffset: 0 },
  'race-future': { file: 'race-future.glb', scale: 0.92, yawOffset: 0 },
});

/**
 * Fleet car id -> model key.
 *
 * Chosen by body silhouette, in this order of fidelity: MPV/luxury van, SUV,
 * hatchback, sedan. Cars without an entry fall back to `DEFAULT_MODEL_KEY` so
 * adding a car to the fleet can never blank the showroom.
 */
const CAR_MODEL_MAP = Object.freeze({
  'avanza-2024': 'van',
  'innova-zenix-2024': 'suv-luxury',
  'pajero-sport-2023': 'suv',
  'brio-rs-2024': 'hatchback-sports',
  'alphard-facelift-2023': 'van',
  'ioniq-5-ev-2024': 'race-future',
});

/** Used when a fleet car has no explicit model. */
export const DEFAULT_MODEL_KEY = 'sedan';

/**
 * Resolves the model key for a car id.
 *
 * @param {string} carId
 * @returns {string} A key that is guaranteed to exist in the library.
 */
export function resolveModelKey(carId) {
  if (carId && Object.hasOwn(CAR_MODEL_MAP, carId)) return CAR_MODEL_MAP[carId];
  return DEFAULT_MODEL_KEY;
}

/**
 * Builds the descriptor needed to load and place one car's model.
 *
 * @param {string} carId
 * @returns {{key: string, url: string, scale: number, yawOffset: number}}
 */
export function getModelDescriptor(carId) {
  const key = resolveModelKey(carId);
  const entry = MODEL_LIBRARY[key] || MODEL_LIBRARY[DEFAULT_MODEL_KEY];

  return {
    key,
    url: `${MODEL_BASE_PATH}/${entry.file}`,
    scale: entry.scale,
    yawOffset: entry.yawOffset,
  };
}

/**
 * Every distinct model URL the showroom needs, for preloading.
 *
 * @returns {string[]}
 */
export function listModelUrls() {
  return [...new Set(Object.values(MODEL_LIBRARY).map((entry) => `${MODEL_BASE_PATH}/${entry.file}`))];
}

/**
 * The texture every model references by relative URI.
 * Exported so the loading screen can prefetch it and so a test can assert the
 * asset is actually shipped.
 */
export const SHARED_TEXTURE_URL = `${MODEL_BASE_PATH}/Textures/colormap.png`;
