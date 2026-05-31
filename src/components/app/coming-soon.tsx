import { Construction } from "lucide-react";

export function ComingSoon({
  phase,
  title,
  description,
}: {
  phase: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-border bg-card flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center">
      <div className="bg-secondary text-primary mb-4 flex size-14 items-center justify-center rounded-2xl">
        <Construction className="size-7" />
      </div>
      <span className="text-primary mb-2 font-mono text-xs tracking-widest uppercase">
        {phase}
      </span>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">{description}</p>
    </div>
  );
}
