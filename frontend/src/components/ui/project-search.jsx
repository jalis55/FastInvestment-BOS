import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, LoaderCircle, Search } from 'lucide-react';
import { useApiQuery } from '@/hooks/use-api-query';
import { getApiError } from '@/api/errors';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { SurfaceCard } from './surface-card';

export function ProjectPicker({ value, onChange, disabled = false, action, options, required = true, placeholder = 'Search by project ID or name', emptyHint = 'Choose an active project or enter its ID.' }) {
  const id = useId();
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const projectsQuery = useApiQuery('/api/stock/project/list/', { enabled: !options });
  const availableProjects = options ?? projectsQuery.data.filter((project) => project.project_active_status);
  const query = value.trim().toLowerCase();
  const projects = availableProjects.filter((project) => (
    !query || String(project.project_id).toLowerCase().includes(query) || String(project.project_title ?? '').toLowerCase().includes(query)
  ));
  const selected = availableProjects.find((project) => project.project_id === value);
  const activeProject = projects[activeIndex];

  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, open]);

  const select = (project) => {
    onChange({ target: { value: project.project_id } });
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      if (projects.length) setActiveIndex((index) => event.key === 'ArrowDown'
        ? (index + 1) % projects.length
        : (index <= 0 ? projects.length : index) - 1);
    } else if (event.key === 'Enter' && open && activeProject) {
      event.preventDefault();
      select(activeProject);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div>
        <label htmlFor={id} className="field-label">Project ID</label>
        <div ref={rootRef} className="relative" onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input ref={inputRef} id={id} role="combobox" aria-expanded={open} aria-controls={`${id}-projects`}
              aria-autocomplete="list" aria-activedescendant={open && activeProject ? `${id}-option-${activeProject.project_id}` : undefined}
              aria-describedby={`${id}-hint`} autoComplete="off" placeholder={placeholder}
              className={cn('field-input min-h-[52px] pl-12', action ? 'pr-36' : 'pr-12')} required={required} disabled={disabled} value={value}
              onClick={() => setOpen(true)} onKeyDown={handleKeyDown}
              onChange={(event) => { onChange(event); setActiveIndex(-1); setOpen(true); }} />
            <div className="absolute inset-y-0 right-2 flex items-center gap-1">
              <button type="button" disabled={disabled} aria-label={open ? 'Hide projects' : 'Show projects'}
                aria-expanded={open} aria-controls={`${id}-projects`}
                onClick={() => { setOpen((previous) => !previous); setActiveIndex(-1); inputRef.current?.focus(); }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50">
                <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} aria-hidden="true" />
              </button>
              {action}
            </div>
          </div>
          {open && <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <ul ref={listRef} id={`${id}-projects`} role="listbox" aria-label="Active projects" aria-busy={projectsQuery.loading} className="max-h-64 overflow-y-auto overscroll-contain p-1.5">
              {!projectsQuery.loading && !projectsQuery.error && projects.map((project, index) => (
                <li key={project.project_id} id={`${id}-option-${project.project_id}`} role="option"
                  aria-selected={project.project_id === value} data-index={index}
                  onPointerDown={(event) => event.preventDefault()} onClick={() => select(project)}
                  className={cn('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-slate-50', index === activeIndex && 'bg-blue-50', project.project_id === value && 'text-blue-700')}>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium text-slate-900">{project.project_title}</span><span className="mt-0.5 block text-xs text-slate-500">{project.project_id}</span></span>
                  {project.project_id === value && <Check size={16} aria-hidden="true" />}
                </li>
              ))}
            </ul>
            {projectsQuery.loading && <p role="status" className="flex items-center gap-2 px-4 pb-4 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" />Loading projects…</p>}
            {projectsQuery.error && <div role="alert" className="space-y-2 px-4 pb-4 text-sm text-red-700"><p>{getApiError(projectsQuery.error)}</p><Button type="button" size="sm" variant="outline" onClick={projectsQuery.refetch}>Try again</Button></div>}
            {!projectsQuery.loading && !projectsQuery.error && !projects.length && <p role="status" className="px-4 pb-4 text-sm text-slate-500">No projects match your search.</p>}
          </div>}
        </div>
        <p id={`${id}-hint`} className="mt-2 text-xs text-slate-500">{selected ? selected.project_title : emptyHint}</p>
    </div>
  );
}

export function ProjectSearch({ value, onChange, onSubmit, loading = false }) {
  return <SurfaceCard className="relative z-20 mx-auto mb-8 max-w-3xl">
    <form onSubmit={onSubmit} aria-label="Find a project" aria-busy={loading}>
      <ProjectPicker value={value} onChange={onChange} disabled={loading} action={
        <Button type="submit" size="sm" disabled={loading || !value.trim()}>
          {loading && <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />}
          {loading ? 'Searching…' : 'Search'}
        </Button>
      } />
    </form>
  </SurfaceCard>;
}
