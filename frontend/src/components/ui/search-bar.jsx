import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

function SearchBar({
  value,
  onChange,
  placeholder = "Search",
  className,
  inputClassName,
  action,
  ...props
}) {
  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
        <Search size={18} />
      </div>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          "field-input min-h-[52px] pl-12",
          action ? "pr-28" : "",
          inputClassName
        )}
        {...props}
      />
      {action ? <div className="absolute inset-y-0 right-0 flex items-center pr-2">{action}</div> : null}
    </div>
  );
}

export { SearchBar };
