import React, { useEffect, useMemo } from 'react';
import { AdditiveBlending, CanvasTexture } from 'three';
import { MeshReflectorMaterial } from '@react-three/drei';
import { WALK_HALF_EXTENT } from '../../domain/showroomNavigation.js';
import { FLOOR_STYLE, PEDESTAL_RADIUS, RING_RADIUS } from '../../data/showroomLayout.js';
import StudioEnvironment from './StudioEnvironment.jsx';

/**
 * The hall itself: floor, walls, lighting and the ring of pedestals.
 *
 * Everything is procedural primitives rather than a downloaded scene, because
 * the hall must match the walkable bounds exactly. A downloaded room would
 * drift out of sync with `WALK_HALF_EXTENT` the moment either changed, and the
 * visitor would walk through a wall that looks solid.
 */

const WALL_HEIGHT = 5.2;
const EXTENT = WALK_HALF_EXTENT;

/** Ceiling fixtures, placed on the ring so each car gets its own light pool. */
function CeilingLights({ slots }) {
  return (
    <group>
      {slots.map((slot) => (
        <group
          key={`ceiling-${slot.carId}`}
          position={[slot.position.x * 0.82, WALL_HEIGHT - 0.12, slot.position.z * 0.82]}
        >
          {/* Emissive panel: the visible source of the pool below. Without a
              visible fixture the hall reads as lit by nothing. */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.5, 0.4]} />
            <meshBasicMaterial color="#dbeafe" toneMapped={false} />
          </mesh>

          {/* Non-shadow lens flare. A small additive sprite is enough to sell
              the fixture at a fraction of a bloom pass. */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <planeGeometry args={[2.6, 1.1]} />
            <meshBasicMaterial
              color="#4b7fd6"
              transparent
              opacity={0.35}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Pedestal ring markers, one per car slot. */
function Pedestals({ slots }) {
  return (
    <group>
      {slots.map((slot) => (
        <mesh
          key={`pedestal-${slot.carId}`}
          position={[slot.position.x, 0.035, slot.position.z]}
          receiveShadow
        >
          <cylinderGeometry args={[PEDESTAL_RADIUS, PEDESTAL_RADIUS + 0.1, 0.07, 48]} />
          <meshStandardMaterial color="#1b2637" roughness={0.72} metalness={0.18} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Soft wash of light across the floor.
 *
 * One large radial gradient rather than a disc per car: six per-car discs
 * overlapped and left visible seams where their edges met, which read as a
 * dark X across the hall. A single wash has no seams and costs one draw call
 * instead of six.
 *
 * The gradient also avoids a hard rim. A flat translucent circle reads as a
 * decal on a dark floor; a fade reads as light.
 */
function FloorWash() {
  const gradient = useMemo(() => {
    if (typeof document === 'undefined') return null;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    const half = size / 2;
    const radial = ctx.createRadialGradient(half, half, 0, half, half, half);
    radial.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    radial.addColorStop(0.55, 'rgba(255, 255, 255, 0.18)');
    radial.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, size, size);

    return new CanvasTexture(canvas);
  }, []);

  // A CanvasTexture is not garbage collected by Three.js; releasing it here
  // keeps repeated mode switches from leaking a texture each time.
  useEffect(() => () => gradient?.dispose(), [gradient]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <circleGeometry args={[FLOOR_STYLE.outerRadius, 72]} />
      <meshBasicMaterial
        map={gradient}
        color="#1f4d85"
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

/**
 * The hall floor.
 *
 * `MeshReflectorMaterial` renders the scene a second time into a small buffer
 * and blends it back, blurred. It is the cheapest way to make a showroom read
 * as a real space: the cars appear *in* the room rather than pasted onto a dark
 * rectangle, and the vertical reflection is a depth cue the eye cannot fake.
 *
 * The reflection buffer is deliberately small (256px). It is blurred to the
 * point where the extra resolution would not survive anyway, so 256 costs
 * almost nothing and looks the same as 1024.
 *
 * A reflector shader does not receive shadows, so a `shadowMaterial` disc sits
 * just above it to catch the key light. A plane was rejected: at the corners it
 * would extend past the circular floor and show shadows on nothing.
 */
function HallFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[FLOOR_STYLE.outerRadius + 1.2, 72]} />
        <MeshReflectorMaterial
          resolution={256}
          mixBlur={1.1}
          mixStrength={1.35}
          blur={[240, 90]}
          mirror={0.42}
          depthScale={0.9}
          minDepthThreshold={0.35}
          maxDepthThreshold={1.3}
          color="#0c1220"
          metalness={0.55}
          roughness={0.82}
        />
      </mesh>

      {/* Shadow catcher, matched to the floor's radius so nothing leaks past it */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow>
        <circleGeometry args={[FLOOR_STYLE.outerRadius + 1.2, 72]} />
        <shadowMaterial color="#000000" opacity={0.45} />
      </mesh>
    </group>
  );
}

export function ShowroomEnvironment({ slots = [] }) {
  const wallSegments = useMemo(
    () => [
      { position: [0, WALL_HEIGHT / 2, -EXTENT], rotationY: 0 },
      { position: [0, WALL_HEIGHT / 2, EXTENT], rotationY: Math.PI },
      { position: [-EXTENT, WALL_HEIGHT / 2, 0], rotationY: Math.PI / 2 },
      { position: [EXTENT, WALL_HEIGHT / 2, 0], rotationY: -Math.PI / 2 },
    ],
    []
  );

  return (
    <group>
      {/* Reflected light, so the paint has something to mirror. This is what
          separates "flat coloured toy" from "painted car". */}
      <StudioEnvironment intensity={1} />

      {/* Ambient fill so shadowed sides never go fully black */}
      <ambientLight intensity={0.34} />
      <hemisphereLight args={['#93b4e0', '#0a0f18', 0.5]} />

      {/* Key light from above the ring, matching the light pools */}
      <directionalLight
        position={[6, 12, 7]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-7, 8, -6]} intensity={0.5} color="#7aa2e0" />

      {/* Two shadowless spots give each half of the ring its own warm pool at
          the cost of two lights, not six. */}
      <spotLight
        position={[0, WALL_HEIGHT - 0.3, 0]}
        angle={0.95}
        penumbra={0.9}
        intensity={2.2}
        color="#dbeafe"
        distance={18}
      />

      <HallFloor />

      {/* Inlaid ring under the pedestals, a visual guide for the walking path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[RING_RADIUS - 0.06, RING_RADIUS + 0.06, 96]} />
        <meshBasicMaterial
          color="#2b4a7d"
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Central medallion so the middle of the hall is not an empty void */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[FLOOR_STYLE.innerRadius, FLOOR_STYLE.innerRadius + 0.04, 72]} />
        <meshBasicMaterial
          color="#24405f"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Centre marker: a thin disc instead of a filled one, which read as a
          dark blob once the light pools overlapped it */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.032, 0]}>
        <circleGeometry args={[0.16, 24]} />
        <meshBasicMaterial
          color="#3b6fae"
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Walls */}
      {wallSegments.map((wall, index) => (
        <mesh
          key={`wall-${index}`}
          position={wall.position}
          rotation={[0, wall.rotationY, 0]}
          receiveShadow
        >
          <planeGeometry args={[EXTENT * 2, WALL_HEIGHT]} />
          <meshStandardMaterial color="#0b111c" roughness={0.94} metalness={0.05} side={1} />
        </mesh>
      ))}

      {/* Ceiling, closing the box so the background never shows through */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT, 0]}>
        <planeGeometry args={[EXTENT * 2, EXTENT * 2]} />
        <meshStandardMaterial color="#070b12" roughness={1} />
      </mesh>

      <Pedestals slots={slots} />
      <CeilingLights slots={slots} />
      <FloorWash />
    </group>
  );
}

export default ShowroomEnvironment;