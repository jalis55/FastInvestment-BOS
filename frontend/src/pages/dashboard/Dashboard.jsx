import React from 'react';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="bg-blue-500 h-8 w-8 rounded-md flex items-center justify-center mr-3">
            <span className="font-bold text-white">F</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Fast Investment Limited</h1>
        </div>
        <div className="text-sm text-gray-600">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">Welcome to Your Trading Dashboard</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Monitor markets, track performance, and execute strategies all in one place
          </p>
        </div>

        {/* Market Indicators */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">S&P 500</h3>
              <span className="text-green-500 text-sm font-medium">▲ 1.2%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">4,891.23</div>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">NASDAQ</h3>
              <span className="text-green-500 text-sm font-medium">▲ 0.8%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">15,628.04</div>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">DOW JONES</h3>
              <span className="text-red-500 text-sm font-medium">▼ 0.3%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">37,806.39</div>
          </div>
        </div> */}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center p-6">
            <div className="bg-blue-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Market Overview</h3>
            <p className="text-gray-600">Track performance </p>
          </div>
          
          <div className="text-center p-6">
            <div className="bg-blue-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Portfolio Tracking</h3>
            <p className="text-gray-600">Monitor your investments</p>
          </div>
          
          <div className="text-center p-6">
            <div className="bg-blue-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Risk Management</h3>
            <p className="text-gray-600">Protect your investments</p>
          </div>
        </div>

        {/* CTA Button */}
        {/* <div className="text-center mt-16">
          <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg transition duration-300 shadow-md">
            Explore Dashboard
          </button>
        </div> */}
      </main>

      {/* Footer */}
      {/* <footer className="text-center p-6 text-sm text-gray-500 border-t border-gray-200 mt-8">
        <p>Market data is for illustrative purposes only. Past performance is not indicative of future results.</p>
      </footer> */}
    </div>
  );
};

export default Dashboard;