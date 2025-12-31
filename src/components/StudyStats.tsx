import { motion } from "framer-motion";
import { Clock, CheckCircle2, XCircle, Trophy } from "lucide-react";
import { VocabularyWord } from "@/types/vocabulary";

interface StudyStatsProps {
  words: VocabularyWord[];
  elapsedTime: string;
}

export function StudyStats({ words, elapsedTime }: StudyStatsProps) {
  const totalCorrect = words.reduce((sum, w) => sum + (w.correctCount || 0), 0);
  const totalIncorrect = words.reduce((sum, w) => sum + (w.incorrectCount || 0), 0);
  const totalAttempts = totalCorrect + totalIncorrect;
  const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        icon={<Clock className="w-5 h-5" />}
        label="Time"
        value={elapsedTime}
        color="text-primary"
      />
      <StatCard
        icon={<CheckCircle2 className="w-5 h-5" />}
        label="Correct"
        value={totalCorrect.toString()}
        color="text-success"
      />
      <StatCard
        icon={<XCircle className="w-5 h-5" />}
        label="Incorrect"
        value={totalIncorrect.toString()}
        color="text-destructive"
      />
      <StatCard
        icon={<Trophy className="w-5 h-5" />}
        label="Accuracy"
        value={`${Math.round(accuracy)}%`}
        color="text-warning"
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-4 shadow-sm border border-border"
    >
      <div className={`flex items-center gap-2 ${color} mb-1`}>
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-card-foreground">{value}</p>
    </motion.div>
  );
}
