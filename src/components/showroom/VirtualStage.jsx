import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import CarModel from './CarModel.jsx';
import ShowroomEnvironment from './ShowroomEnvironment.jsx';
import VisitorControls from './VisitorControls.jsx';
import TouchPad from './TouchPad.jsx';
import { getModelDescriptor } from '../../data/carModels.js';
import { buildShowroomLayout, getSpawnPoint } from '../../data/showroomLayout.js';
import { INTERACT_DISTANCE, findNearestCar } from '../../domain/showroomNavigation.js';

/**
 * Virtual mode: first-person walk around the hall.
 *
 * Each car is a static exhibit. Walking near one reveals a floating prompt;
 * activating it opens the same booking flow the catalog uses, so the two
 * modes cannot drift apart on pricing or validation.
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

      {/* Prompt floats above the roof; only rendered for the nearest car */}
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

export function VirtualStage({ cars, onInspect, paused = false }) {
  const [nearbyId, setNearbyId] = useState(null);
  const [padInput, setPadInput] = useState({});

  const layout = useMemo(() => buildShowroomLayout(cars), [cars]);
  const spawn = useMemo(() => getSpawnPoint(), []);

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

  const handleInspect = (carId) => {
    const car = cars.find((item) => item.id === carId);
    if (car) onInspect(car);
  };

  const nearbyCar = nearbyId ? cars.find((car) => car.id === nearbyId) : null;

  return (
    <div className="showroom-stage showroom-stage-virtual">
      <Canvas
        shadows="percentage"
        dpr={[1, 1.75]}
        camera={{ position: [spawn.x, 1.62, spawn.z], fov: 68, near: 0.05, far: 60 }}
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

          <VisitorControls
            spawn={spawn}
            enabled={!paused}
            anchors={anchors}
            findNearest={findNearest}
            onNearbyChange={setNearbyId}
            externalInput={padInput}
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

      <VisitorHint layout={layout} cars={cars} onInspect={onInspect} />
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
function VisitorHint({ layout, cars, onInspect }) {
  return (
    <div className="showroom-hint">
      <p className="showroom-hint-title">Keliling showroom</p>
      <p className="showroom-hint-text">
        <span className="showroom-hint-short">
          <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> untuk berjalan, seret untuk menoleh.
        </span>
        <span className="showroom-hint-long">
          Gunakan <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> atau tombol panah untuk
          berjalan, lalu seret mouse untuk menoleh. Dekati mobil untuk melihat detailnya.
        </span>
        {/* A phone has no keyboard, so telling the visitor to press W is worse
            than saying nothing. This variant names the pad instead. */}
        <span className="showroom-hint-touch">
          Gunakan tombol panah di kiri bawah untuk berjalan, lalu seret layar untuk menoleh.
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

export default VirtualStage;
