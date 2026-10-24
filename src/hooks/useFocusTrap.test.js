import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTabStop, FOCUSABLE_SELECTOR } from './useFocusTrap.js';

describe('Hook: useFocusTrap / resolveTabStop', () => {
  it('wraps forward from the last control to the first', () => {
    assert.equal(resolveTabStop({ shiftKey: false, activeIndex: 4, count: 5 }), 0);
  });

  it('lets the browser handle forward Tab in the middle of the dialog', () => {
    assert.equal(resolveTabStop({ shiftKey: false, activeIndex: 2, count: 5 }), null);
  });

  it('wraps backward from the first control to the last', () => {
    assert.equal(resolveTabStop({ shiftKey: true, activeIndex: 0, count: 5 }), 4);
  });

  it('wraps backward from the container itself (activeIndex -1) to the last control', () => {
    assert.equal(resolveTabStop({ shiftKey: true, activeIndex: -1, count: 5 }), 4);
  });

  it('lets the browser handle backward Tab in the middle of the dialog', () => {
    assert.equal(resolveTabStop({ shiftKey: true, activeIndex: 3, count: 5 }), null);
  });

  it('never traps when the dialog has no focusable control', () => {
    assert.equal(resolveTabStop({ shiftKey: false, activeIndex: -1, count: 0 }), null);
    assert.equal(resolveTabStop({ shiftKey: true, activeIndex: -1, count: 0 }), null);
  });

  it('handles a single-control dialog by wrapping to itself', () => {
    assert.equal(resolveTabStop({ shiftKey: false, activeIndex: 0, count: 1 }), 0);
    assert.equal(resolveTabStop({ shiftKey: true, activeIndex: 0, count: 1 }), 0);
  });

  it('exposes a selector that covers native interactive elements', () => {
    for (const part of ['a[href]', 'button', 'input', 'select', 'textarea', '[tabindex]']) {
      assert.ok(FOCUSABLE_SELECTOR.includes(part), `selector should include ${part}`);
    }
  });
});
