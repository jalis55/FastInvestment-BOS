import * as React from "react";
import { useMatches } from "react-router-dom";

import { cn } from "@/lib/utils";

function PageIntro({ eyebrow, title, description, className, actions, as: Heading = "h2" }) {
  const routeTitle = useMatches().at(-1)?.handle?.pageTitle;
  const showTitle = title && (Heading !== "h1" || !routeTitle);
  const showText = eyebrow || showTitle || description;
  if (!showText && !actions) return null;

  return (
    <div className={cn("mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between", className)}>
      {showText && <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        {showTitle && <Heading className={cn("section-heading", Heading === "h1" && "text-2xl md:text-3xl")}>{title}</Heading>}
        {description ? <p className="section-copy">{description}</p> : null}
      </div>}
      {actions ? <div className="md:ml-auto">{actions}</div> : null}
    </div>
  );
}

export { PageIntro };
