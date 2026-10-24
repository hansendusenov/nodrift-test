import React from 'react';
import { Environment, Lightformer } from '@react-three/drei';

/**
 * Shared studio lighting rig, baked into an environment map.
 *
 * Why this exists
 * ---------------
 * The Kenney models ship with a single base-colour texture and no metalness, so
 * a scene lit only by directional lights leaves the paint perfectly matte. The
 * body then reads as coloured paper, however good the geometry is — which is
 * exactly the "this does not look like real 3D" impression a turntable invites.
 *
 * An environment map gives every standard material something to reflect. The
 * long side strips are the important part: as the car turns on the turntable a
 * highlight travels along the flank, and that motion is what the eye reads as a
 * curved, painted surface.
 *
 * `Environment` with children is used rather than `preset`, because a preset
 * downloads an HDR from a CDN. The showroom must work offline, and a networked
 * asset on the critical path would also break the "models are served locally"
 * claim the rest of the 3D track rests on.
 *
 * Everything here is baked once (`frames={1}`), so the cost is a single render
 * pass at mount, not per frame.
 */
export function StudioEnvironment({ intensity = 1 }) {
  return (
    <Environment resolution={128} frames={1} environmentIntensity={intensity}>
      {/* Broad softbox overhead: the main source of the highlight on the roof */}
      <Lightformer
        form="rect"
        intensity={2.6}
        color="#eaf2ff"
        position={[0, 9, 0]}
        rotation-x={Math.PI / 2}
        scale={[18, 18, 1]}
      />

      {/* Long strips on both flanks, at car height. These are what make the
          paint read as glossy: they draw two travelling highlights, not one. */}
      <Lightformer
        form="rect"
        intensity={2.2}
        color="#ffffff"
        position={[-9, 2.6, 0]}
        rotation-y={Math.PI / 2}
        scale={[14, 0.9, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.7}
        color="#a9c8ff"
        position={[9, 2.6, 0]}
        rotation-y={-Math.PI / 2}
        scale={[14, 0.9, 1]}
      />

      {/* Cool kicker behind the exhibits, so the rear three-quarter view is
          not a black silhouette against the background. */}
      <Lightformer
        form="circle"
        intensity={1.5}
        color="#7fb0ff"
        position={[0, 3.2, -9]}
        scale={5}
      />

      {/* Warm floor bounce, which stops the underside going pitch black */}
      <Lightformer
        form="rect"
        intensity={0.7}
        color="#ffd9a8"
        position={[0, -4, 0]}
        rotation-x={-Math.PI / 2}
        scale={[16, 16, 1]}
      />
    </Environment>
  );
}

export default StudioEnvironment;