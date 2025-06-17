import React, { useEffect, useRef, useState } from "react";
import { FaDoorClosed, FaTimes, FaSearch, FaBars } from "react-icons/fa";
import { useUser } from "../../context/userContext";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../apiClient";
import SocketContext from "../socket/SocketContext";

function Dashboard() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Changed to true for desktop default
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [me, setMe] = useState("");
  const [onlineUsers, setOnlineUser] = useState([]);
  const hasJoined = useRef(false);

  const socket = SocketContext.getSocket();
  console.log(socket);

  useEffect(() => {
    if (user && socket && !hasJoined.current) {
      socket.emit("join", { id: user._id, name: user.username });
      hasJoined.current = true;
    }

    socket.on("me", (id) => setMe(id));

    socket.on("online-users", (onlineUser) => {
      setOnlineUser(onlineUser);
    });

    return () => {
      socket.off("me");
      socket.off("online-users");
    };
  }, [user, socket]);

  console.log("Online Users State:", onlineUsers); // Added for clearer debugging
  const isOnlineUser = (userId) => onlineUsers.some((u) => u.userId === userId);

  const allusers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/user");
      if (response.data.success !== false) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    allusers();
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      (u.username?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (u.email?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const handleSelectedUser = (userId) => {
    // Toggle selection - deselect if already selected, select if not
    setSelectedUser(selectedUser === userId ? null : userId);
  };

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
      updateUser(null);
      localStorage.removeItem("userData");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 text-gray-800 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-200/20 to-cyan-100/20"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-300/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-200/10 rounded-full blur-3xl"></div>

      <div className="flex min-h-screen relative z-10">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-10 md:hidden bg-black/20"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <aside
          className={`bg-white/70 backdrop-blur-3xl border border-blue-200/50 text-gray-800 w-80 h-screen p-6 space-y-6 fixed z-20 transition-transform shadow-3xl shadow-blue-200/50 flex flex-col ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  Users
                </h1>
                <p className="text-gray-600 text-xs tracking-wide">LinkUp</p>
              </div>
            </div>
            <button
              type="button"
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 p-2 rounded-lg transition-all duration-300"
              onClick={() => setIsSidebarOpen(false)}
              title="Close sidebar"
            >
              <FaTimes size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="group">
            <div className="relative flex items-center bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-lg p-3 transition-all duration-300 hover:bg-white focus-within:bg-white focus-within:border-blue-400 focus-within:shadow-lg focus-within:shadow-blue-300/50">
              <FaSearch className="text-blue-500 mr-2 transition-colors duration-300 group-focus-within:text-blue-600" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none focus:placeholder-gray-600 transition-colors duration-300 text-sm"
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto space-y-3 pr-2">
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="text-blue-600">Loading users...</div>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user._id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                      selectedUser === user._id
                        ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
                        : "bg-white/60 backdrop-blur-sm border border-blue-200/30 hover:bg-white hover:border-blue-300 hover:shadow-md hover:shadow-blue-200/30"
                    }`}
                    onClick={() => handleSelectedUser(user._id)}
                  >
                    <div className="relative">
                      {user.profilepic ? (
                        <>
                          <img
                            src={user.profilepic}
                            alt={`${user.username}'s profile`}
                            className={`w-12 h-12 rounded-full border-2 ${
                              selectedUser === user._id
                                ? "border-white"
                                : "border-blue-200"
                            } transition-all duration-300`}
                          />
                          {isOnlineUser(user._id) && (
                            <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-lg animate-bounce"></span>
                          )}
                        </>
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-base transition-all duration-300 ${
                            selectedUser === user._id
                              ? "bg-white text-blue-600 border-white"
                              : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-blue-200"
                          }`}
                        >
                          {user.username?.charAt(0)?.toUpperCase() || "U"}
                          {isOnlineUser(user._id) && ( // Added online indicator here too
                            <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-lg"></span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                      <span
                        className={`font-semibold text-sm truncate ${
                          selectedUser === user._id
                            ? "text-white"
                            : "text-gray-800"
                        }`}
                      >
                        {user.username}
                      </span>
                      <span
                        className={`text-xs truncate ${
                          selectedUser === user._id
                            ? "text-blue-100"
                            : "text-gray-500"
                        }`}
                      >
                        {user.email}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Logout - Moved to bottom */}
          {user && (
            <div
              onClick={handleLogout}
              className="flex items-center gap-3 bg-gradient-to-r from-red-500 to-red-600 text-white p-3 cursor-pointer rounded-lg font-semibold shadow-md hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 active:scale-98 mt-auto"
            >
              <FaDoorClosed />
              <span>Logout</span>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-300 p-6 ${
            isSidebarOpen ? "md:ml-80" : "ml-0" // Use md:ml-80 for desktop and ml-0 for mobile
          }`}
        >
          {/* Sidebar Toggle Button - Always visible */}
          {!isSidebarOpen && (
            <button
              type="button"
              className="fixed top-4 left-4 z-30 bg-white/80 backdrop-blur-sm border border-blue-200/50 text-blue-600 p-3 rounded-lg shadow-lg hover:shadow-blue-300/30 transition-all duration-300 hover:bg-white"
              onClick={() => setIsSidebarOpen(true)}
              title="Open sidebar"
            >
              <FaBars size={18} />
            </button>
          )}

          <div className="max-w-4xl mx-auto">
            {/* Welcome */}
            <div className="flex items-center gap-5 mb-6 bg-white/80 backdrop-blur-sm border border-blue-200/50 p-6 rounded-xl shadow-lg shadow-blue-200/30">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl">
                👋
              </div>
              <div>
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-500 text-transparent bg-clip-text">
                  Hey {user?.username || "Guest"}! 👋
                </h1>
                <p className="text-lg text-gray-600 mt-2">
                  Ready to{" "}
                  <strong className="text-blue-600">
                    connect with friends instantly?
                  </strong>{" "}
                  Just <strong className="text-blue-600">select a user</strong>{" "}
                  and start your video call! 🎥✨
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white/80 backdrop-blur-sm border border-blue-200/50 p-6 rounded-xl shadow-lg shadow-blue-200/30 text-sm">
              <h2 className="text-lg font-semibold mb-4 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                💡 How to Start a Video Call?
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>📌 Open the sidebar to see online users.</li>
                <li>🔍 Use the search bar to find a specific person.</li>
                <li>🎥 Click on a user to start a video call instantly!</li>
              </ul>
            </div>

            {/* Selected User Content */}
            {selectedUser && (
              <div className="mt-6 bg-white/80 backdrop-blur-sm border border-blue-200/50 p-6 rounded-xl shadow-lg shadow-blue-200/30">
                <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-4">
                  Selected User
                </h3>
                <p className="text-gray-600">User ID: {selectedUser}</p>
                {/* Add more user details content here */}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;