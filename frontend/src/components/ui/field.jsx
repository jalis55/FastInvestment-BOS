import * as React from "react";

import { cn } from "@/lib/utils";

function Field({ label, error, htmlFor, className, children }) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const control = React.isValidElement(children) ? React.cloneElement(children, {
    id: children.props.id || htmlFor,
    'aria-invalid': error ? true : children.props['aria-invalid'],
    'aria-describedby': [children.props['aria-describedby'], error ? errorId : null].filter(Boolean).join(' ') || undefined,
  }) : children;
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="field-label">
          {label}
        </label>
      ) : null}
      {control}
      {error ? <p id={errorId} role="alert" className="field-error">{error}</p> : null}
    </div>
  );
}

export { Field };
