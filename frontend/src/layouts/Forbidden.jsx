// src/pages/Forbidden.jsx
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Forbidden = () => {
  useEffect(() => {
    document.title = "403 Forbidden - Access Denied";
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full p-8 text-center"
      >
        <div className="relative mb-8">
          <motion.div
            animate={{
              rotate: [0, 10, -10, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              repeat: Infinity,
              repeatType: "reverse",
              duration: 2,
            }}
            className="absolute -top-6 -left-6 w-16 h-16 bg-red-100 rounded-full"
          />
          <motion.div
            animate={{
              rotate: [0, -10, 10, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              repeat: Infinity,
              repeatType: "reverse",
              duration: 2.5,
              delay: 0.3,
            }}
            className="absolute -bottom-6 -right-6 w-16 h-16 bg-red-100 rounded-full"
          />
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative z-10 mx-auto w-32 h-32 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-20 w-20 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </motion.div>
        </div>

        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-5xl font-bold text-gray-800 mb-4"
        >
          403
        </motion.h1>
        
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-semibold text-gray-700 mb-4"
        >
          Access Denied
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 mb-8"
        >
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-1"
          >
            Return to Home
          </Link>
        </motion.div>
      </motion.div>

      {/* Floating circles decoration */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, 20, 0],
            x: [0, i % 2 === 0 ? 10 : -10, 0],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={`absolute rounded-full bg-red-100 opacity-60`}
          style={{
            width: `${Math.random() * 50 + 20}px`,
            height: `${Math.random() * 50 + 20}px`,
            left: `${Math.random() * 80 + 10}%`,
            top: `${Math.random() * 80 + 10}%`,
          }}
        />
      ))}
    </div>
  );
};

export default Forbidden;