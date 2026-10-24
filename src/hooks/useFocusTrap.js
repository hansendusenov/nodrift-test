import { useEffect } from 'react';

export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Decides whether a Tab keypress must be intercepted to keep focus inside a
 * dialog. Extracted as a pure function so the wrap-around rule is unit
 * testable without a DOM (nodrift-standard Section 6).
 *
 * @param {object} params
 * @param {boolean} params.shiftKey Whether Shift is held (backwards traversal).
 * @param {number} params.activeIndex Index of the focused element, or -1 when
 *   focus is on the dialog container itself.
 * @param {number} params.count Number of focusable elements in the dialog.
 * @returns {number|null} Index to move focus to, or null to let the browser
 *   handle the default Tab behaviour.
 */
export function resolveTabStop({ shiftKey, activeIndex, count }) {
  if (count <= 0) return null;

  const last = count - 1;

  if (shiftKey) {
    // Wrapping backwards: from the first control (or the container) to the last.
    if (activeIndex <= 0) return last;
    return null;
  }

  // Wrapping forwards: from the last control to the first.
  if (activeIndex === last) return 0;
  return null;
}

/**
 * Traps keyboard focus inside a dialog container and restores focus to the
 * element that opened it on unmount (nodrift-ui Section 6).
 *
 * - Moves initial focus to the container so assistive tech announces the dialog.
 * - Wraps Tab / Shift+Tab at the first and last focusable descendant.
 * - Returns focus to the trigger element when the dialog closes.
 *
 * @param {React.RefObject<HTMLElement>} containerRef Ref to the dialog container.
 * @param {boolean} isActive Whether the dialog is currently open.
 */
export function useFocusTrap(containerRef, isActive = true) {
  useEffect(() => {
    if (!isActive) return undefined;

    const container = containerRef.current;
    if (!container) return undefined;

    const previouslyFocused = document.activeElement;

    const getFocusable = () =>
      Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
      );

    // Focus the dialog itself: screen readers announce it, and the first Tab
    // lands on the first control instead of skipping past the heading.
    container.focus({ preventScroll: true });

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const activeIndex = focusable.indexOf(document.activeElement);
      const target = resolveTabStop({
        shiftKey: event.shiftKey,
        activeIndex,
        count: focusable.length,
      });

      if (target !== null) {
        event.preventDefault();
        focusable[target].focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [containerRef, isActive]);
}

export default useFocusTrap;
