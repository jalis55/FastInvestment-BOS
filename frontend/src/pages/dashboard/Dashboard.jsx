import React, { useState, useEffect } from 'react';

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Header with subtle animation */}
      <header className="flex justify-between items-center p-6 border-b border-gray-200 animate-fade-in">
        <div className="flex items-center">
          <div className="bg-blue-500 h-8 w-8 rounded-md flex items-center justify-center mr-3 animate-pulse-slow">
            <span className="font-bold text-white">F</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Fast Investment Limited</h1>
        </div>
        <div className="text-sm text-gray-600">
          {currentTime.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Animated welcome section */}
        <div className="text-center mb-16 animate-slide-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
            Welcome to Your <span className="text-blue-500 animate-color-cycle">Trading Dashboard</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Monitor markets, track performance, and execute strategies all in one place
          </p>
        </div>

        {/* Animated market ticker */}
        {/* <div className="max-w-2xl mx-auto mb-16 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100 animate-float">
          <div className="flex overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap">
              <span className="mx-4 font-semibold">S&P 500: <span className="text-green-500">4,891.23 (+1.2%)</span></span>
              <span className="mx-4 font-semibold">NASDAQ: <span className="text-green-500">15,628.04 (+0.8%)</span></span>
              <span className="mx-4 font-semibold">DOW: <span className="text-red-500">37,806.39 (-0.3%)</span></span>
              <span className="mx-4 font-semibold">BTC: <span className="text-green-500">$61,243.50 (+2.1%)</span></span>
            </div>
          </div>
        </div> */}

        {/* Animated Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center p-6 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 animate-fade-in-up">
            <div className="bg-blue-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Market Overview</h3>
            <p className="text-gray-600">Track performance</p>
          </div>
          
          <div className="text-center p-6 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="bg-blue-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow" style={{ animationDelay: '0.3s' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Portfolio Tracking</h3>
            <p className="text-gray-600">Monitor your investments</p>
          </div>
          
          <div className="text-center p-6 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="bg-blue-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow" style={{ animationDelay: '0.6s' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Risk Management</h3>
            <p className="text-gray-600">Protect your investments</p>
          </div>
        </div>

        {/* Animated CTA Button */}
        {/* <div className="text-center mt-16 animate-pulse">
          <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md">
            Explore Dashboard
          </button>
        </div> */}
      </main>

      {/* Add custom animation styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes colorCycle {
          0% { color: #3b82f6; }
          50% { color: #10b981; }
          100% { color: #3b82f6; }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
          100% { transform: translateY(0px); }
        }
        @keyframes bounceSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulseSlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-fade-in {
          animation: fadeIn 1s ease-out;
        }
        .animate-slide-in {
          animation: slideIn 1s ease-out;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
        }
        .animate-color-cycle {
          animation: colorCycle 5s infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-bounce-slow {
          animation: bounceSlow 3s infinite;
        }
        .animate-pulse-slow {
          animation: pulseSlow 2s infinite;
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;