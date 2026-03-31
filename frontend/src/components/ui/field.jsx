import * as React from "react";

import { cn } from "@/lib/utils";

function Field({ label, error, htmlFor, className, children }) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="field-label">
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export { Field };
