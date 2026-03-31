import * as React from "react";

import { cn } from "@/lib/utils";

function SurfaceCard({ className, children, tone = "default", ...props }) {
  const toneClasses = {
    default: "page-card",
    subtle: "metric-card-soft",
    strong: "metric-card",
    compact: "page-card-tight",
  };

  return (
    <section
      className={cn(toneClasses[tone] || toneClasses.default, className)}
      {...props}
    >
      {children}
    </section>
  );
}

export { SurfaceCard };
