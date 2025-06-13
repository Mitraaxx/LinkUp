import { createContext, useContext, useEffect, useState } from "react";

// Create the context
const UserContext = createContext();

// Provider component to wrap around your app
const UserProvider = ({ children }) => {
    // Initialize state with localStorage data to prevent flickering issues
    const [user, setUser] = useState(() => {
        try {
            const storedUser = localStorage.getItem("userData");
            return storedUser ? JSON.parse(storedUser) : null;
        } catch (error) {
            console.error("Error parsing stored user data:", error);
            return null;
        }
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        try {
            const storedUser = localStorage.getItem("userData");
            console.log("Fetched user from localStorage:", storedUser);
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error("Error loading user data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Function to update user data
    const updateUser = (newUserData) => {
        try {
            setUser(newUserData);
            if (newUserData) {
                localStorage.setItem("userData", JSON.stringify(newUserData));
            } else {
                localStorage.removeItem("userData");
            }
        } catch (error) {
            console.error("Error saving user data:", error);
        }
    };

    return (
        <UserContext.Provider value={{ user, updateUser, loading }}>
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

// Export everything
export { UserProvider, useUser };