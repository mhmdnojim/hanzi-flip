import { useEffect } from "react";

interface KeyboardShortcutHandlers {
  onFlip: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onCorrect: () => void;
  onIncorrect: () => void;
  onShuffle: () => void;
}

export function useKeyboardShortcuts({
  onFlip,
  onNext,
  onPrevious,
  onCorrect,
  onIncorrect,
  onShuffle,
}: KeyboardShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          onFlip();
          break;
        case "ArrowRight":
          e.preventDefault();
          onNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          onPrevious();
          break;
        case "ArrowUp":
          e.preventDefault();
          onCorrect();
          break;
        case "ArrowDown":
          e.preventDefault();
          onIncorrect();
          break;
        case "s":
        case "S":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onShuffle();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onFlip, onNext, onPrevious, onCorrect, onIncorrect, onShuffle]);
}
