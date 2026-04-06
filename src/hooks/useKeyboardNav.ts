import { useEffect } from 'react';

interface Options {
  onConfirm: () => void;
  onPrev: () => void;
  onInvalid: () => void;
  onOpenTab?: () => void;
  enabled: boolean;
}

export function useKeyboardNav({ onConfirm, onPrev, onInvalid, onOpenTab, enabled }: Options) {
  // When an iframe receives a click it steals focus, swallowing all keydown
  // events. Recapture focus on the parent window so shortcuts keep working.
  useEffect(() => {
    if (!enabled) return;
    const recapture = () => { setTimeout(() => window.focus(), 50); };
    window.addEventListener('blur', recapture);
    return () => window.removeEventListener('blur', recapture);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isTyping = tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT';

      // Cmd+Enter and Cmd+Up — work everywhere including textarea
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onConfirm();
        return;
      }

      if (e.key === 'ArrowUp' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onPrev();
        return;
      }

      if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onInvalid();
        return;
      }

      if (e.key === 'o' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenTab?.();
        return;
      }

      // Key shortcuts only when not typing
      if (isTyping) return;
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onConfirm, onPrev, onInvalid, onOpenTab, enabled]);
}
