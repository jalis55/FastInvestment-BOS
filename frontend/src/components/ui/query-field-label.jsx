export function QueryFieldLabel({ htmlFor, children, loading, error, onRetry, loadingLabel, errorLabel }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pb-2">
      <label htmlFor={htmlFor} className="text-sm font-medium tracking-wide text-slate-700">{children}</label>
      {loading && <span role="status" className="text-sm text-slate-500">{loadingLabel}</span>}
      {!loading && error && (
        <span role="alert" className="text-sm text-red-700">
          {errorLabel} <button type="button" onClick={onRetry} className="underline">Retry</button>
        </span>
      )}
    </div>
  );
}
