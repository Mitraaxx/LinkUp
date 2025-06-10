import { useState } from 'react';
import { FaUser, FaLock } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../../apiClient';

function Auth({type}) {
    const navigate = useNavigate();
    // const { updateUser } = useUser(); // Uncomment this when you have the context
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (type === 'signup' && formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match!');
            return;
        }
        setLoading(true);
        try {
            const endpoint = type === 'signup' ? '/auth/signup' : '/auth/login';
            const response = await apiClient.post(endpoint, {
                username: formData.username,
                password: formData.password
            });
            toast.success(response.data.message || 'Success!');
            if(type === 'signup'){
                navigate('/login')
            }
            if (type === 'login') {
                // updateUser(response.data) // Uncomment when you have the context
                // Save token in cookies
                const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
                const expires = "expires=" + date.toUTCString();
                document.cookie = `jwt=${response.data.token}; path=/; ${expires}`;
                navigate('/')
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Something went wrong!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 text-gray-800 relative overflow-hidden">
            {/* Background elements - now very subtle and light */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-200/20 to-cyan-100/20"></div>
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-300/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-200/10 rounded-full blur-3xl"></div>
            
            {/* Main form container - light glass effect */}
            <div className="relative bg-white/70 backdrop-blur-3xl border border-blue-200/50 text-gray-800 py-8 px-10 rounded-2xl shadow-3xl shadow-blue-200/50 w-full max-w-sm m-4">
                {/* Subtle glow effect - very light and internal */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100/10 to-cyan-50/10 rounded-2xl blur-xl"></div>
                
                <div className="relative z-10">
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <FaUser className="text-white text-lg" />
                        </div>
                        <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-1">
                            {type === 'signup' ? 'Create Account' : 'Welcome Back'}
                        </h2>
                        <p className="text-gray-600 text-xs tracking-wide">LinkUp</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="group">
                            <div className="relative flex items-center bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-lg p-3 transition-all duration-300 hover:bg-white focus-within:bg-white focus-within:border-blue-400 focus-within:shadow-lg focus-within:shadow-blue-300/50">
                                <FaUser className="text-blue-500 mr-2 transition-colors duration-300 group-focus-within:text-blue-600" />
                                <input
                                    type="text"
                                    name="username"
                                    placeholder="Username"
                                    className="w-full bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none focus:placeholder-gray-600 transition-colors duration-300 text-sm"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="group">
                            <div className="relative flex items-center bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-lg p-3 transition-all duration-300 hover:bg-white focus-within:bg-white focus-within:border-blue-400 focus-within:shadow-lg focus-within:shadow-blue-300/50">
                                <FaLock className="text-blue-500 mr-2 transition-colors duration-300 group-focus-within:text-blue-600" />
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Password"
                                    className="w-full bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none focus:placeholder-gray-600 transition-colors duration-300 text-sm"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        
                        {type === 'signup' && (
                            <div className="group">
                                <div className="relative flex items-center bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-lg p-3 transition-all duration-300 hover:bg-white focus-within:bg-white focus-within:border-blue-400 focus-within:shadow-lg focus-within:shadow-blue-300/50">
                                    <FaLock className="text-blue-500 mr-2 transition-colors duration-300 group-focus-within:text-blue-600" />
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        placeholder="Confirm Password"
                                        className="w-full bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none focus:placeholder-gray-600 transition-colors duration-300 text-sm"
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                        )}
                        
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-700 to-indigo-600 text-white py-3 rounded-lg font-semibold shadow-md hover:shadow-lg hover:shadow-blue-700/30 transition-all duration-300 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden text-base"
                            disabled={loading}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-500 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                            <span className="relative z-10">
                                {loading ? 'Processing...' : type === 'signup' ? 'Create Account' : 'Sign In'}
                            </span>
                        </button>
                    </form>
                    
                    <div className="mt-6 text-center">
                        <div className="flex items-center justify-center mb-3">
                            <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent w-full"></div>
                        </div>
                        <p className="text-gray-600 text-xs">
                            {type === 'signup' ? (
                                <>
                                    Already have an account?{' '}
                                    <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-300 hover:underline">
                                        Sign In
                                    </Link>
                                </>
                            ) : (
                                <>
                                    Don't have an account?{' '}
                                    <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-300 hover:underline">
                                        Create Account
                                    </Link>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>
            <Toaster position="top-center" />
        </div>
    )
}

export default Auth;