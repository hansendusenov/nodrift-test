import React, { forwardRef, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AVATAR_HEIGHT } from '../../domain/showroomNavigation.js';

/**
 * The visitor's body, seen from behind in third-person view.
 *
 * Built from primitives rather than a downloaded rig on purpose: a rigged human
 * GLB with an animation clip would add megabytes to a page whose entire 3D
 * payload is currently 1.09 MB, and the only animation needed is a walk cycle
 * driven by two sine waves. Primitives also guarantee the silhouette matches
 * `AVATAR_HEIGHT`, which the camera maths depends on.
 *
 * The root group is moved imperatively by `VisitorControls` (position + yaw).
 * Only the limbs and the bob are animated here, from the `motion` ref the
 * controls update each frame. Sharing a ref avoids a React state update per
 * frame for a value that is only ever read by a shader-side transform.
 */

/** Palette kept local: the avatar is the only object in the hall with these. */
const PALETTE = Object.freeze({
  jacket: '#2f6fe4',
  jacketDark: '#1d4ba8',
  trousers: '#141c2b',
  shoe: '#0a0e16',
  skin: '#e0a878',
  hair: '#171b24',
  badge: '#eaf2ff',
});

/** Height of the hip pivot, in metres. Legs hang from here. */
const HIP_Y = 0.86;
/** Height of the shoulder pivot. Arms hang from here. */
const SHOULDER_Y = 1.42;
/** Peak limb swing, in radians. Above ~0.8 it reads as marching. */
const SWING = 0.62;

export const VisitorAvatar = forwardRef(function VisitorAvatar(
  { motionRef, visible = true },
  rootRef
) {
  const bobRef = useRef(null);
  const legLeft = useRef(null);
  const legRight = useRef(null);
  const armLeft = useRef(null);
  const armRight = useRef(null);

  // Animation state lives in refs: it changes every frame and never needs to
  // cause a re-render.
  const phase = useRef(0);
  const amplitude = useRef(0);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const motion = motionRef?.current;
    const moving = Boolean(motion?.moving);
    const speed = Number.isFinite(motion?.speed) ? motion.speed : 0;

    // Ease the swing in and out so starting to walk does not snap a limb.
    const target = moving ? SWING : 0;
    amplitude.current += (target - amplitude.current) * Math.min(1, delta * 9);

    if (moving) {
      // Cadence follows walking speed, so the feet keep pace with the ground.
      phase.current += delta * Math.max(1.2, speed) * 2.1;
    }

    const swing = Math.sin(phase.current) * amplitude.current;
    const ratio = SWING === 0 ? 0 : amplitude.current / SWING;

    if (legLeft.current) legLeft.current.rotation.x = swing;
    if (legRight.current) legRight.current.rotation.x = -swing;
    // Arms counter-swing; without that the walk reads as a hop.
    if (armLeft.current) armLeft.current.rotation.x = -swing * 0.75;
    if (armRight.current) armRight.current.rotation.x = swing * 0.75;

    if (bobRef.current) {
      // Two bounces per stride, plus a slow idle breath when standing still.
      const stride = Math.abs(Math.sin(phase.current)) * 0.035 * ratio;
      const breath = Math.sin(state.clock.elapsedTime * 1.7) * 0.006 * (1 - ratio);
      bobRef.current.position.y = stride + breath;
    }
  });

  return (
    <group ref={rootRef} visible={visible} name="visitor-avatar">
      <group ref={bobRef}>
        {/* Legs ------------------------------------------------------- */}
        <group ref={legLeft} position={[-0.085, HIP_Y, 0]}>
          <mesh position={[0, -0.385, 0]} castShadow>
            <capsuleGeometry args={[0.075, 0.62, 4, 10]} />
            <meshStandardMaterial color={PALETTE.trousers} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.735, 0.035]} castShadow>
            <boxGeometry args={[0.13, 0.08, 0.22]} />
            <meshStandardMaterial color={PALETTE.shoe} roughness={0.6} />
          </mesh>
        </group>

        <group ref={legRight} position={[0.085, HIP_Y, 0]}>
          <mesh position={[0, -0.385, 0]} castShadow>
            <capsuleGeometry args={[0.075, 0.62, 4, 10]} />
            <meshStandardMaterial color={PALETTE.trousers} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.735, 0.035]} castShadow>
            <boxGeometry args={[0.13, 0.08, 0.22]} />
            <meshStandardMaterial color={PALETTE.shoe} roughness={0.6} />
          </mesh>
        </group>

        {/* Torso ------------------------------------------------------ */}
        <mesh position={[0, 1.16, 0]} castShadow>
          <capsuleGeometry args={[0.155, 0.42, 6, 12]} />
          <meshStandardMaterial color={PALETTE.jacket} roughness={0.62} metalness={0.08} />
        </mesh>

        {/* Shoulder yoke: a slightly darker cap that reads as a collar */}
        <mesh position={[0, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.185, 0.16, 0.09, 14]} />
          <meshStandardMaterial color={PALETTE.jacketDark} roughness={0.7} />
        </mesh>

        {/* Name badge, so the avatar reads as showroom staff, not a player */}
        <mesh position={[0.09, 1.19, 0.17]}>
          <boxGeometry args={[0.09, 0.05, 0.012]} />
          <meshStandardMaterial
            color={PALETTE.badge}
            emissive={PALETTE.badge}
            emissiveIntensity={0.35}
            roughness={0.4}
          />
        </mesh>

        {/* Neck + head ------------------------------------------------ */}
        <mesh position={[0, 1.51, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 0.09, 10]} />
          <meshStandardMaterial color={PALETTE.skin} roughness={0.8} />
        </mesh>

        <mesh position={[0, 1.62, 0]} castShadow>
          <sphereGeometry args={[0.125, 18, 14]} />
          <meshStandardMaterial color={PALETTE.skin} roughness={0.75} />
        </mesh>

        {/* Hair: a half-sphere shell. Rotated so the flat side faces back,
            leaving the face clear when the visitor turns the camera around. */}
        <mesh position={[0, 1.665, -0.012]} rotation={[-0.22, 0, 0]} castShadow>
          <sphereGeometry args={[0.132, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
          <meshStandardMaterial color={PALETTE.hair} roughness={0.9} />
        </mesh>

        {/* Arms ------------------------------------------------------- */}
        {/* Sleeves use the darker jacket shade and sit clear of the torso, so
            the limbs read as limbs from behind instead of blending into one
            rounded blob at this camera angle. */}
        <group ref={armLeft} position={[-0.235, SHOULDER_Y, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <capsuleGeometry args={[0.06, 0.48, 4, 10]} />
            <meshStandardMaterial color={PALETTE.jacketDark} roughness={0.65} />
          </mesh>
          <mesh position={[0, -0.58, 0]} castShadow>
            <sphereGeometry args={[0.058, 10, 8]} />
            <meshStandardMaterial color={PALETTE.skin} roughness={0.8} />
          </mesh>
        </group>

        <group ref={armRight} position={[0.235, SHOULDER_Y, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <capsuleGeometry args={[0.06, 0.48, 4, 10]} />
            <meshStandardMaterial color={PALETTE.jacketDark} roughness={0.65} />
          </mesh>
          <mesh position={[0, -0.58, 0]} castShadow>
            <sphereGeometry args={[0.058, 10, 8]} />
            <meshStandardMaterial color={PALETTE.skin} roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* Contact patch: without it the feet look like they hover, because the
          real shadow is soft and offset by the key light. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.34, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.32} depthWrite={false} />
      </mesh>
    </group>
  );
});

/** Exported so a test can assert the model matches the camera's assumption. */
export const AVATAR_MODEL_HEIGHT = AVATAR_HEIGHT;

export default VisitorAvatar;
