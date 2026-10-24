import React, { useCallback, useRef, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * On-screen movement pad for touch devices.
 *
 * Without this, the Virtual mode is unusable on a phone: the only movement
 * inputs were a keyboard (absent) and drag-to-look (which turns the camera but
 * does not walk). The pad feeds the exact same input shape the keyboard does,
 * so there is one movement path, not two.
 *
 * Pointer events are used rather than touch events so a stylus and a mouse work
 * too, and `setPointerCapture` keeps a finger that slides off the button from
 * leaving the visitor walking forever.
 */
const DIRECTIONS = Object.freeze([
  { id: 'forward', label: 'Maju', icon: ChevronUp, className: 'pad-up' },
  { id: 'left', label: 'Kiri', icon: ChevronLeft, className: 'pad-left' },
  { id: 'backward', label: 'Mundur', icon: ChevronDown, className: 'pad-down' },
  { id: 'right', label: 'Kanan', icon: ChevronRight, className: 'pad-right' },
]);

export function TouchPad({ onChange }) {
  const [active, setActive] = useState({});
  const activeRef = useRef({});

  const commit = useCallback(
    (next) => {
      activeRef.current = next;
      setActive(next);
      onChange?.(next);
    },
    [onChange]
  );

  const press = (id) => (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    commit({ ...activeRef.current, [id]: true });
  };

  const release = (id) => (event) => {
    event.preventDefault();
    const element = event.currentTarget;
    if (element.hasPointerCapture?.(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    commit({ ...activeRef.current, [id]: false });
  };

  return (
    <div className="showroom-pad" role="group" aria-label="Kontrol gerak">
      {DIRECTIONS.map((direction) => {
        const Icon = direction.icon;
        const pressed = Boolean(active[direction.id]);

        return (
          <button
            key={direction.id}
            type="button"
            className={`showroom-pad-btn ${direction.className} ${pressed ? 'is-pressed' : ''}`}
            aria-label={direction.label}
            aria-pressed={pressed}
            onPointerDown={press(direction.id)}
            onPointerUp={release(direction.id)}
            onPointerCancel={release(direction.id)}
            onPointerLeave={release(direction.id)}
            onContextMenu={(event) => event.preventDefault()}
          >
            <Icon size={18} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

export default TouchPad;
