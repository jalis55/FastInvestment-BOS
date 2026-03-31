import * as React from "react";

import { cn } from "@/lib/utils";

function EmptyState({ title, description, className }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-200 bg-white/80 px-6 py-12 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]",
        className
      )}
    >
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
    </div>
  );
}

export { EmptyState };
