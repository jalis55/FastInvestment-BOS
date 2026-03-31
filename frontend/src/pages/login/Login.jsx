import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import ButtonSpinner from '@/components/ButtonSpinner';


const Login = () => {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const togglePasswordVisibility = () => setShowPassword(!showPassword);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Basic validation
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);

        const status = await login(email, password);
        if (status === 200) {
            navigate(location.state?.from || '/', { replace: true });
        }
        else if (status === "Network Error") {
            setError("Connection Failed");
        }
        else {
            setError('Login failed. Please check your credentials.');
        }
        setLoading(false);

    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(145deg,#07111f_0%,#0f172a_42%,#1d4ed8_100%)] px-4 py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.26),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.22),transparent_26%)]" />
            <div className="relative mx-auto grid min-h-[86vh] max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="hidden text-white lg:block">
                    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.32em] text-cyan-200">
                        Fast Investment Limited
                    </p>
                    <h1 className="max-w-xl text-5xl font-semibold leading-tight">
                        A calmer, sharper backoffice for investment operations.
                    </h1>
                    <p className="mt-6 max-w-xl text-base leading-8 text-blue-50/80">
                        Manage projects, trades, investor reporting, and internal workflows from a single professional control surface.
                    </p>
                    <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
                        <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                            <p className="text-2xl font-semibold">Projects</p>
                            <p className="mt-2 text-sm text-blue-50/70">Track opening, closing, and operational status.</p>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                            <p className="text-2xl font-semibold">Trades</p>
                            <p className="mt-2 text-sm text-blue-50/70">Review instruments, pricing, and transaction flow.</p>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                            <p className="text-2xl font-semibold">Reports</p>
                            <p className="mt-2 text-sm text-blue-50/70">Keep key performance and profit details in reach.</p>
                        </div>
                    </div>
                </div>
                <div className="mx-auto w-full max-w-md">
                    <div className="rounded-[32px] border border-white/20 bg-white/92 px-6 pb-6 pt-8 shadow-[0_30px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:px-8">
                        <div className="mb-8">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                Secure Access
                            </p>
                            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                                Sign in to continue
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Enter your account credentials to open the backoffice dashboard.
                            </p>
                        </div>
                        <form className="space-y-6" onSubmit={handleSubmit}>

                            <div>
                                <label htmlFor="email" className="field-label">Email address / Username</label>
                                <div className="mt-1">
                                    <input
                                        id="email"
                                        name="email"
                                        type="text"
                                        data-testid="username"
                                        required
                                        className="field-input"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="demo@admin.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="password" className="field-label">
                                    Password
                                </label>
                                <div className="mt-1 relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        data-testid="password"
                                        autoComplete="current-password"
                                        required
                                        className="field-input pr-11"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="demo@123"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition hover:text-slate-600"
                                        onClick={togglePasswordVisibility}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Session secured with HttpOnly cookies</span>
                            </div>
                            <div>
                                <button
                                    data-testid="login"
                                    type="submit"
                                    className="primary-button group relative"
                                >
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                                        <svg className="h-5 w-5 text-blue-100/80 group-hover:text-white"
                                            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                                            aria-hidden="true">
                                            <path fillRule="evenodd"
                                                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                                clipRule="evenodd"></path>
                                        </svg>
                                    </span>
                                    {loading ? <ButtonSpinner /> : "Sign In"}

                                </button>
                            </div>
                            {error && (
                                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login;
