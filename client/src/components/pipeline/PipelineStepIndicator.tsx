import { Check, SkipForward } from "lucide-react";

export type StepStatus = "pending" | "active" | "done" | "skipped";

interface Step {
  id: string;
  label: string;
  status: StepStatus;
}

interface PipelineStepIndicatorProps {
  steps: Step[];
  onStepClick: (stepId: string) => void;
}

export default function PipelineStepIndicator({ steps, onStepClick }: PipelineStepIndicatorProps) {
  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1 last:flex-none">
          <button
            onClick={() => onStepClick(step.id)}
            disabled={step.status === "pending"}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              step.status === "active"
                ? "bg-primary text-primary-foreground shadow-sm"
                : step.status === "done"
                ? "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                : step.status === "skipped"
                ? "bg-secondary/50 text-muted-foreground hover:bg-secondary cursor-pointer"
                : "bg-secondary/30 text-muted-foreground/50 cursor-not-allowed"
            }`}
          >
            <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs shrink-0 ${
              step.status === "active"
                ? "bg-primary-foreground/20"
                : step.status === "done"
                ? "bg-primary/20"
                : "bg-secondary"
            }`}>
              {step.status === "done" ? (
                <Check className="w-3 h-3" />
              ) : step.status === "skipped" ? (
                <SkipForward className="w-3 h-3" />
              ) : (
                index + 1
              )}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </button>

          {index < steps.length - 1 && (
            <div className={`h-px flex-1 mx-1 min-w-[8px] ${
              step.status === "done" || step.status === "skipped"
                ? "bg-primary/30"
                : "bg-border"
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}
