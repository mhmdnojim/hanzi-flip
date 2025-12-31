import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

interface ProgressBarProps {
  current: number;
  total: number;
  percentage: number;
  onSeek: (index: number) => void;
  correctCount?: number;
  incorrectCount?: number;
}

export function ProgressBar({ 
  current, 
  total, 
  percentage, 
  onSeek,
  correctCount = 0,
  incorrectCount = 0 
}: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newPercentage = x / rect.width;
      const newIndex = Math.round(newPercentage * (total - 1));
      onSeek(newIndex);
    },
    [total, onSeek]
  );

  const handleDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging || !barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const newPercentage = x / rect.width;
      const newIndex = Math.round(newPercentage * (total - 1));
      onSeek(newIndex);
    },
    [isDragging, total, onSeek]
  );

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {current + 1} / {total}
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-500 font-medium">
            <Check className="w-4 h-4" />
            {correctCount}
          </span>
          <span className="flex items-center gap-1 text-rose-500 font-medium">
            <X className="w-4 h-4" />
            {incorrectCount}
          </span>
        </div>
      </div>
      <div
        ref={barRef}
        className="relative h-3 bg-muted rounded-full cursor-pointer overflow-hidden"
        onClick={handleClick}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleDrag}
      >
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-violet-500 to-pink-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-primary rounded-full shadow-lg border-2 border-white cursor-grab active:cursor-grabbing"
          style={{ left: `calc(${percentage}% - 10px)` }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        />
      </div>
    </div>
  );
}
