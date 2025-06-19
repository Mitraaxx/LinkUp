import { createContext, useContext, useEffect, useState } from "react";

// Create the context
const UserContext = createContext();

// Provider component to wrap around your app
const UserProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const storedUser = localStorage.getItem("userData");
            return storedUser ? JSON.parse(storedUser) : null;
        } catch (err) {
            console.error("Failed to parse userData:", err);
            return null;
        }
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("userData");
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (err) {
            console.error("Error reading userData from localStorage:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateUser = (newUserData) => {
        try {
            setUser(newUserData);
            if (newUserData) {
                localStorage.setItem("userData", JSON.stringify(newUserData));
                if (newUserData.token) {
                    localStorage.setItem("token", newUserData.token); // Save token separately
                }
            } else {
                localStorage.removeItem("userData");
                localStorage.removeItem("token");
            }
        } catch (err) {
            console.error("Failed to update user:", err);
        }
    };

    const logoutUser = () => {
        setUser(null);
        localStorage.removeItem("userData");
        localStorage.removeItem("token");
    };

    return (
        <UserContext.Provider value={{ user, updateUser, logoutUser, loading }}>
            {children}
        </UserContext.Provider>
    );
};

// Custom hook for consuming the context
const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
};

export { UserProvider, useUser };
