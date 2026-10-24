import React, { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import CarModel from './CarModel.jsx';
import ShowroomEnvironment from './ShowroomEnvironment.jsx';
import ThirdPersonControls from './ThirdPersonControls.jsx';
import VisitorAvatar from './VisitorAvatar.jsx';
import TouchPad from './TouchPad.jsx';
import { getModelDescriptor } from '../../data/carModels.js';
import { buildShowroomLayout, getThirdPersonSpawn } from '../../data/showroomLayout.js';
import { INTERACT_DISTANCE, findNearestCar } from '../../domain/showroomNavigation.js';

/**
 * Virtual mode, third-person: an RPG-style walk-around.
 *
 * Same hall, same exhibits and the same booking flow as the first-person walk;
 * only the camera moved. That matters — the two camera modes must not drift
 * apart on pricing or on which cars exist, so both are driven by the one layout
 * builder and the one proximity helper.
 *
 * A visible avatar is the whole point of the mode. The camera looks *at* the
 * body rather than *being* the body, so the visitor can see where they stand in
 * the hall and which way they are facing.
 */

/** A car standing on its pedestal, with a proximity prompt. */
function Exhibit({ car, slot, highlighted, onInspect }) {
  const descriptor = getModelDescriptor(car.id);

  return (
    <group position={[slot.position.x, 0, slot.position.z]}>
      <CarModel
        url={descriptor.url}
        scale={descriptor.scale}
        rotationY={slot.rotationY + descriptor.yawOffset}
      />

      {highlighted && (
        <Html position={[0, 2.35, 0]} center distanceFactor={9} zIndexRange={[20, 0]}>
          <button
            type="button"
            className="showroom-prompt"
            onClick={onInspect}
            aria-label={`Lihat dan sewa ${car.name}`}
          >
            <span className="showroom-prompt-name">{car.name}</span>
            <span className="showroom-prompt-hint">Klik untuk lihat detail</span>
          </button>
        </Html>
      )}
    </group>
  );
}

export function ThirdPersonStage({ cars, onInspect, paused = false }) {
  const [nearbyId, setNearbyId] = useState(null);
  const [padInput, setPadInput] = useState({});

  // The avatar's transform is written by the controller every frame, so it is
  // held in a ref rather than state. Re-rendering the scene 60 times a second to
  // move one group would be pure waste.
  const avatarRef = useRef(null);
  const motionRef = useRef({ moving: false, speed: 0 });

  const layout = useMemo(() => buildShowroomLayout(cars), [cars]);
  const spawn = useMemo(() => getThirdPersonSpawn(), []);

  // Anchors are the plain data the domain helper needs; passing the layout
  // objects directly would couple the domain to the layout shape.
  const anchors = useMemo(
    () => layout.map((slot) => ({ carId: slot.carId, position: slot.position })),
    [layout]
  );

  const findNearest = useCallback(
    (position, list) => findNearestCar(position, list, INTERACT_DISTANCE),
    []
  );

  const handleAvatarMove = useCallback((position, yaw) => {
    const group = avatarRef.current;
    if (!group) return;
    group.position.set(position.x, 0, position.z);
    group.rotation.y = yaw;
  }, []);

  const handleInspect = (carId) => {
    const car = cars.find((item) => item.id === carId);
    if (car) onInspect(car);
  };

  const nearbyCar = nearbyId ? cars.find((car) => car.id === nearbyId) : null;

  return (
    <div className="showroom-stage showroom-stage-virtual showroom-stage-rpg">
      <Canvas
        shadows="percentage"
        dpr={[1, 1.75]}
        // The camera is re-aimed every frame by ThirdPersonControls; this is
        // only the pose for the very first frame, before useFrame runs.
        camera={{ position: [spawn.x, 2.6, spawn.z + 4.3], fov: 58, near: 0.05, far: 60 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#070b12']} />
        <fog attach="fog" args={['#070b12', 14, 30]} />

        <Suspense fallback={null}>
          <ShowroomEnvironment slots={layout} />

          {layout.map((slot) => {
            const car = cars.find((item) => item.id === slot.carId);
            if (!car) return null;

            return (
              <Exhibit
                key={slot.carId}
                car={car}
                slot={slot}
                highlighted={nearbyId === slot.carId}
                onInspect={() => handleInspect(slot.carId)}
              />
            );
          })}

          <VisitorAvatar
            ref={avatarRef}
            motionRef={motionRef}
            visible={!paused}
            position={[spawn.x, 0, spawn.z]}
          />

          <ThirdPersonControls
            spawn={spawn}
            enabled={!paused}
            anchors={anchors}
            findNearest={findNearest}
            onNearbyChange={setNearbyId}
            externalInput={padInput}
            motionRef={motionRef}
            onAvatarMove={handleAvatarMove}
          />
        </Suspense>
      </Canvas>

      {/* Touch movement: the only way to walk on a device without a keyboard */}
      {!paused && <TouchPad onChange={setPadInput} />}

      {/* Keyboard-accessible fallback: the 3D prompt needs a pointer, so the
          same action is offered as a real button in the overlay. */}
      {nearbyCar && (
        <div className="showroom-nearby-bar" role="status">
          <span className="showroom-nearby-text">
            Anda dekat <strong>{nearbyCar.name}</strong>
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onInspect(nearbyCar)}
          >
            Lihat Detail
          </button>
        </div>
      )}

      <PlayerHint layout={layout} cars={cars} onInspect={onInspect} />
    </div>
  );
}

/**
 * Standing instructions plus a list of exhibits.
 *
 * The jump list exists for two reasons: the floating in-scene prompt requires a
 * pointer, and a visitor who cannot use WASD needs a way to reach a car. It is
 * the accessible equivalent of walking up to one.
 */
function PlayerHint({ layout, cars, onInspect }) {
  return (
    <div className="showroom-hint">
      <p className="showroom-hint-title">Mode RPG · orang ketiga</p>
      <p className="showroom-hint-text">
        <span className="showroom-hint-short">
          <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> berjalan, seret untuk memutar kamera.
        </span>
        <span className="showroom-hint-long">
          Gunakan <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> atau tombol panah untuk
          berjalan; karakter akan menghadap arah jalannya. Seret mouse untuk memutar kamera di
          sekeliling karakter, dan gulir untuk menjauh atau mendekat. Dekati mobil untuk melihat
          detailnya.
        </span>
        <span className="showroom-hint-touch">
          Gunakan tombol panah di kiri bawah untuk berjalan. Seret layar untuk memutar kamera di
          sekeliling karakter.
        </span>
      </p>
      <ul className="showroom-jump-list">
        {layout.map((slot) => {
          const car = cars.find((item) => item.id === slot.carId);
          if (!car) return null;
          return (
            <li key={slot.carId}>
              <button
                type="button"
                className="showroom-jump"
                onClick={() => onInspect(car)}
                title={`Buka ${car.name}`}
              >
                {car.name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ThirdPersonStage;