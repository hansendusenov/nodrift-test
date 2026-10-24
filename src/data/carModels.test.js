import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MODEL_KEY,
  MODEL_BASE_PATH,
  SHARED_TEXTURE_URL,
  getModelDescriptor,
  listModelUrls,
  resolveModelKey,
} from './carModels.js';

describe('data: carModels - resolveModelKey', () => {
  it('maps every fleet car to a model', () => {
    const ids = [
      'avanza-2024',
      'innova-zenix-2024',
      'pajero-sport-2023',
      'brio-rs-2024',
      'alphard-facelift-2023',
      'ioniq-5-ev-2024',
    ];
    for (const id of ids) {
      assert.notEqual(resolveModelKey(id), undefined, `no model for ${id}`);
    }
  });

  it('falls back for an unknown car instead of returning undefined', () => {
    assert.equal(resolveModelKey('some-future-car'), DEFAULT_MODEL_KEY);
    assert.equal(resolveModelKey(undefined), DEFAULT_MODEL_KEY);
    assert.equal(resolveModelKey(null), DEFAULT_MODEL_KEY);
  });

  it('does not treat an inherited property name as a known car', () => {
    // Object.hasOwn guards against prototype keys such as "constructor"
    assert.equal(resolveModelKey('constructor'), DEFAULT_MODEL_KEY);
    assert.equal(resolveModelKey('toString'), DEFAULT_MODEL_KEY);
  });
});

describe('data: carModels - getModelDescriptor', () => {
  it('returns a served URL, scale and rotation offset', () => {
    const descriptor = getModelDescriptor('avanza-2024');
    assert.equal(descriptor.key, 'van');
    assert.equal(descriptor.url, `${MODEL_BASE_PATH}/van.glb`);
    assert.ok(descriptor.scale > 0);
    assert.equal(typeof descriptor.yawOffset, 'number');
  });

  it('gives different cars different silhouettes where intended', () => {
    const suv = getModelDescriptor('pajero-sport-2023');
    const hatch = getModelDescriptor('brio-rs-2024');
    assert.notEqual(suv.url, hatch.url);
  });

  it('still returns a usable descriptor for an unknown car', () => {
    const descriptor = getModelDescriptor('mystery-car');
    assert.ok(descriptor.url.startsWith(`${MODEL_BASE_PATH}/`));
    assert.ok(descriptor.url.endsWith('.glb'));
  });
});

describe('data: carModels - asset list', () => {
  it('lists unique model URLs only', () => {
    const urls = listModelUrls();
    assert.equal(new Set(urls).size, urls.length);
    assert.ok(urls.length > 0);
  });

  it('points every model at a .glb under the model base path', () => {
    for (const url of listModelUrls()) {
      assert.ok(url.startsWith(`${MODEL_BASE_PATH}/`), url);
      assert.ok(url.endsWith('.glb'), url);
    }
  });

  it('exposes the shared texture path the GLB files reference', () => {
    // Every Kenney GLB references "Textures/colormap.png" by relative URI
    assert.equal(SHARED_TEXTURE_URL, `${MODEL_BASE_PATH}/Textures/colormap.png`);
  });
});
