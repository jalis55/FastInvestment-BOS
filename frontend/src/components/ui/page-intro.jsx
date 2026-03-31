import * as React from "react";

import { cn } from "@/lib/utils";

function PageIntro({ eyebrow, title, description, className, actions }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="section-heading">{title}</h2>
        {description ? <p className="section-copy">{description}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}

export { PageIntro };
