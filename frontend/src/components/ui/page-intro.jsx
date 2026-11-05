import * as React from "react";

import { cn } from "@/lib/utils";

function PageIntro({ eyebrow, title, description, className, actions, as: Heading = "h2" }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <Heading className={cn("section-heading", Heading === "h1" && "text-2xl md:text-3xl")}>{title}</Heading>
        {description ? <p className="section-copy">{description}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}

export { PageIntro };
