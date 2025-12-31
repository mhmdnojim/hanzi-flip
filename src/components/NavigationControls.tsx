import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavigationControlsProps {
  onPrevious: () => void;
  onNext: () => void;
  onFlip: () => void;
  onCorrect: () => void;
  onIncorrect: () => void;
  isFlipped: boolean;
}

export function NavigationControls({
  onPrevious,
  onNext,
  onFlip,
  onCorrect,
  onIncorrect,
  isFlipped,
}: NavigationControlsProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Main Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={onPrevious}
          className="rounded-full w-14 h-14"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <Button
          variant="default"
          size="lg"
          onClick={onFlip}
          className="rounded-full w-16 h-16 gradient-primary border-0"
        >
          <RotateCcw className={`w-6 h-6 transition-transform ${isFlipped ? "rotate-180" : ""}`} />
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={onNext}
          className="rounded-full w-14 h-14"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      {/* Scoring Controls */}
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onIncorrect}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
        >
          <ThumbsDown className="w-5 h-5" />
          <span className="text-sm font-medium">Incorrect</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCorrect}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success hover:bg-success/20 transition-colors"
        >
          <ThumbsUp className="w-5 h-5" />
          <span className="text-sm font-medium">Correct</span>
        </motion.button>
      </div>

      {/* Keyboard hints */}
      <div className="text-xs text-muted-foreground flex flex-wrap justify-center gap-4">
        <span>← → Navigate</span>
        <span>Space Flip</span>
        <span>↑↓ Score</span>
        <span>S Shuffle</span>
      </div>
    </div>
  );
}
