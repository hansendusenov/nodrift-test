import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls, useProgress } from '@react-three/drei';
import CarModel from './CarModel.jsx';
import StudioEnvironment from './StudioEnvironment.jsx';
import { getModelDescriptor } from '../../data/carModels.js';

/**
 * 3D showroom: one car on a turntable, orbit and zoom with the pointer.
 *
 * This is the "3D" mode. It is intentionally a separate canvas from the Virtual
 * walk so each can be tuned without dragging the other's controls along.
 */

/**
 * Slow idle rotation of the whole exhibit.
 *
 * The rotation lives on the stage, not on the model: turning the car in place
 * while its wheels stayed still would look like a bug. Rotating the group keeps
 * the car and its shadow consistent.
 */
function Turntable({ car, spin }) {
  const descriptor = getModelDescriptor(car.id);
  const groupRef = useRef(null);

  useFrame((_, rawDelta) => {
    if (!spin || !groupRef.current) return;
    // Clamped so a resumed background tab does not jump a quarter turn
    groupRef.current.rotation.y += Math.min(rawDelta, 0.1) * 0.35;
  });

  return (
    <group>
      {/* The stage is static: only the car turns. A rotating floor would drag
          its own shadow around with it, which looks wrong.
          Radius is kept close to the car's footprint (the longest model is
          2.85 m): a larger disc runs off the frame and its rim reads as a
          stray arc rather than as a stage.
          The surface is deliberately glossy: a matte disc under a matte car is
          two flat shapes stacked, whereas a polished plinth reflects the car
          and instantly reads as a three-dimensional object standing on it. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[2.15, 64]} />
        <meshStandardMaterial color="#141c2b" roughness={0.32} metalness={0.62} />
      </mesh>

      {/* Thin rim so the disc edge does not read as a hard cut */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[2.15, 2.22, 64]} />
        <meshBasicMaterial color="#2b4a7d" transparent opacity={0.45} depthWrite={false} />
      </mesh>

      {/* Without a lit floor the car floats in a void: the contact shadow is
          black on a near-black background and is invisible no matter how strong
          it is. The disc gives the shadow something to fall on. */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.75}
        scale={6}
        blur={2.4}
        far={4}
        resolution={512}
        color="#000000"
      />

      <group ref={groupRef}>
        <CarModel
          url={descriptor.url}
          scale={descriptor.scale}
          rotationY={descriptor.yawOffset}
          position={[0, 0, 0]}
        />
      </group>
    </group>
  );
}

/**
 * Download progress for the model, shown over the canvas.
 *
 * `useProgress` reads a global loader store, so it works outside the Canvas
 * tree. Without this the stage is simply black for a second on a slow
 * connection, which is indistinguishable from a failure.
 */
function StageProgress() {
  const { active, progress } = useProgress();

  if (!active) return null;

  return (
    <div className="showroom-stage-progress" role="status" aria-live="polite">
      Memuat model… <span className="tabular-nums">{Math.round(progress)}%</span>
    </div>
  );
}

export function ShowroomStage({ car }) {
  const [autoSpin, setAutoSpin] = useState(true);

  // Pause the idle spin the moment the visitor takes control, so the car does
  // not fight the pointer.
  const handleControlStart = () => setAutoSpin(false);

  return (
    <div className="showroom-stage">
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: [3.5, 1.95, 4.1], fov: 40, near: 0.1, far: 60 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#080c14']} />
        <fog attach="fog" args={['#080c14', 14, 30]} />

        {/* Baked reflections: the one thing that makes the paint look painted */}
        <StudioEnvironment intensity={1.15} />

        <ambientLight intensity={0.4} />
        <hemisphereLight args={['#9dbce8', '#0a0f18', 0.55]} />

        {/* Three-point rig. Each light is named for the role it plays, because
            "which light is the rim" is the first question anyone tuning this
            will ask. */}
        <directionalLight
          position={[5, 8, 6]}
          intensity={1.9}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-normalBias={0.02}
        />
        <directionalLight position={[-6, 4, -5]} intensity={0.6} color="#7aa2e0" />
        <spotLight position={[0, 9, 0]} angle={0.7} penumbra={0.8} intensity={1.6} color="#dbeafe" />

        <Suspense fallback={null}>
          <Turntable car={car} spin={autoSpin} />
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={3.4}
          maxDistance={9}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2 - 0.06}
          target={[0, 0.75, 0]}
          onStart={handleControlStart}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>

      <StageProgress />
    </div>
  );
}

export default ShowroomStage;
