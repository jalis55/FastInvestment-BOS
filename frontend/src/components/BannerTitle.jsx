const BannerTitle = ({ title }) => {
    return (
        <nav aria-label="breadcrumb" className="w-70">
            <ol className="flex w-full flex-wrap items-center rounded-md px-4 py-2">
                <li className="flex cursor-pointer items-center dark:text-white text-sm text-slate-500 transition-colors duration-300 hover:text-slate-800">
                    <h1 className="border-b text-2xl">{title}</h1>
                </li>
            </ol>
            
        </nav>


    )
}

export default BannerTitle