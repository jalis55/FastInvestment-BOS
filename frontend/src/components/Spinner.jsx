

const Spinner = () => {
  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
      <span className="sr-only">Loading</span>
    </div>
  )
}

export default Spinner
