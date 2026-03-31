const BannerTitle = ({ title }) => {
    return (
        <nav aria-label="breadcrumb" className="mb-8 w-full">
            <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Fast Investment Backoffice
                </span>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
            </div>
        </nav>
    )
}

export default BannerTitle
