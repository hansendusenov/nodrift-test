import { useGLTF } from '@react-three/drei';

/**
 * Warms the glTF loader cache so the first car appears without a visible pop.
 *
 * Kept in its own module rather than inside `CarModel.jsx` because exporting a
 * non-component from a component file breaks React Fast Refresh, and because
 * the page only needs this one function, not the whole model component.
 *
 * @param {string[]} urls
 */
export function preloadCarModels(urls = []) {
  for (const url of urls) {
    try {
      useGLTF.preload(url);
    } catch {
      // A failed preload must never break the page; the real load will surface
      // the error through the stage's error boundary instead.
    }
  }
}

export default preloadCarModels;
