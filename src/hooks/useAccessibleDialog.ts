import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getDialogFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getAttribute('aria-hidden') !== 'true'
  );
}

export function getWrappedDialogTarget<T>(
  focusableElements: readonly T[],
  activeElement: T | null,
  backwards: boolean
): T | null {
  if (!focusableElements.length) return null;
  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];
  if (backwards && activeElement === first) return last;
  if (!backwards && activeElement === last) return first;
  return null;
}

interface UseAccessibleDialogOptions {
  open: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  openerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}

export function useAccessibleDialog({
  open,
  dialogRef,
  openerRef,
  onClose,
}: UseAccessibleDialogOptions): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const opener = openerRef.current;

    let active = true;
    const focusInitialTarget = () => {
      if (!active || !dialog.isConnected) return;
      const firstFocusable = getDialogFocusableElements(dialog)[0];
      (firstFocusable || dialog).focus();
    };
    queueMicrotask(focusInitialTarget);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusableElements = getDialogFocusableElements(dialog);
      if (!focusableElements.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const wrappedTarget = getWrappedDialogTarget(
        focusableElements,
        activeElement,
        event.shiftKey
      );
      if (wrappedTarget) {
        event.preventDefault();
        wrappedTarget.focus();
        return;
      }

      if (!dialog.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? focusableElements.at(-1) : focusableElements[0])?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      active = false;
      document.removeEventListener('keydown', handleKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, [dialogRef, openerRef, open]);
}
