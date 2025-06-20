import React, { useState } from "react";
import { User, Lock } from "lucide-react";

function AuthFontMatched({ type = "login" }) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (type === "signup" && formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      alert(
        `${type === "signup" ? "Account created" : "Logged in"} successfully!`
      );
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 text-gray-800 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-200/20 to-cyan-100/20"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-300/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-200/10 rounded-full blur-3xl"></div>

      <div className="relative bg-white/70 backdrop-blur-3xl border border-blue-200/50 text-gray-800 py-8 px-10 rounded-2xl shadow-3xl shadow-blue-200/50 w-full max-w-sm m-4">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/10 to-cyan-50/10 rounded-2xl blur-xl"></div>

        <div className="relative z-10">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <User className="text-white text-lg" />
            </div>
            <h2 className="text-xl sm:text-2xl font-light text-blue-900 tracking-wide leading-tight mb-1">
              {type === "signup" ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-sm text-blue-600 font-light leading-relaxed tracking-wide">
              LinkUp
            </p>
          </div>

          <div className="space-y-4">
            <InputField
              icon={<User />}
              name="username"
              type="text"
              placeholder="Username"
              onChange={handleChange}
            />
            <InputField
              icon={<Lock />}
              name="password"
              type="password"
              placeholder="Password"
              onChange={handleChange}
            />
            {type === "signup" && (
              <InputField
                icon={<Lock />}
                name="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                onChange={handleChange}
              />
            )}

            <button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-blue-700 to-indigo-600 text-white py-3 rounded-lg font-light shadow-md hover:shadow-lg hover:shadow-blue-700/30 transition-all duration-300 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden text-sm tracking-wide"
              disabled={loading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-500 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10">
                {loading
                  ? "Processing..."
                  : type === "signup"
                  ? "Create Account"
                  : "Log In"}
              </span>
            </button>
          </div>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent w-full"></div>
            </div>
            <p className="text-xs text-blue-500 font-light tracking-wide">
              {type === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => window.location.reload()}
                    className="text-blue-600 hover:text-blue-700 font-light transition-colors duration-300 hover:underline"
                  >
                    Log In
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => window.location.reload()}
                    className="text-blue-600 hover:text-blue-700 font-light transition-colors duration-300 hover:underline"
                  >
                    Create Account
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ icon, name, type, placeholder, onChange }) {
  return (
    <div className="group">
      <div className="relative flex items-center bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-lg p-3 transition-all duration-300 hover:bg-white focus-within:bg-white focus-within:border-blue-400 focus-within:shadow-lg focus-within:shadow-blue-300/50">
        <div className="text-blue-500 mr-2 transition-colors duration-300 group-focus-within:text-blue-600">
          {icon}
        </div>
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          className="w-full bg-transparent text-blue-800 placeholder-blue-500 focus:outline-none focus:placeholder-blue-600 transition-colors duration-300 text-sm font-light leading-relaxed"
          onChange={onChange}
          required
        />
      </div>
    </div>
  );
}

export default AuthFontMatched;
