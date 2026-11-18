export default function ProfileField({ name, label, hint, children, ...props }) {
    return (
        <div className="min-w-0">
            <label htmlFor={name} className="field-label">{label}</label>
            {children || <input id={name} name={name} className="field-input" {...props} />}
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
    );
}
