import React from 'react'

const ButtonSpinner = () => {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
      role="status"
      aria-label="Loading"
    />
  )
}

export default ButtonSpinner
