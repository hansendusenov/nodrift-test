import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

/**
 * One Kenney car model.
 *
 * Why the scene is cloned
 * -----------------------
 * `useGLTF` caches by URL, so two cars that share a model (the Avanza and the
 * Alphard both use the van) would otherwise render the *same* object graph.
 * Cloning gives each car its own transform. Geometry, materials and the texture
 * stay shared, so the memory cost is negligible.
 *
 * The component is deliberately static: no wheel spin, no idle animation. A
 * parked exhibit whose wheels turn reads as a rendering bug rather than as
 * motion, and the turntable rotation belongs to the stage, not to the model.
 */
export function CarModel({ url, scale = 1, rotationY = 0, ...groupProps }) {
  const gltf = useGLTF(url);

  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  return (
    <group rotation={[0, rotationY, 0]} scale={scale} {...groupProps}>
      <primitive object={model} />
    </group>
  );
}

export default CarModel;
