import React, { useEffect, useRef, useState } from "react";
import { FaDoorClosed, FaTimes, FaSearch, FaBars, FaPhoneAlt } from "react-icons/fa";
import { useUser } from "../../context/userContext";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../apiClient";
import SocketContext from "../socket/SocketContext";
import Peer from 'simple-peer';

function Dashboard() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [me, setMe] = useState("");
  const [onlineUsers, setOnlineUser] = useState([]);
  const hasJoined = useRef(false);
  const myVideo = useRef();
  const [stream, setStream] = useState(null);
  const [showReciverDetailPopUp, setShowReciverDetailPopUp] = useState(false);
  const [showReciverDetail, setShowReciverDetail] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const connectionRef = useRef();  

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
  

  console.log("Online Users State:", onlineUsers);
  const isOnlineUser = (userId) => onlineUsers.some((u) => u.userId === userId);

  const allusers = async () => {
    // Don't fetch users if current user is not loaded
    if (!user?._id) return;
    
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
    // Only fetch users when user data is available
    if (user?._id) {
      allusers();
    }
  }, [user]);

  const startCall = async (targetUserId) => {
    try {
      console.log("Starting call with user:", targetUserId);
      
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log("Stream created:", currentStream);
      
      setStream(currentStream);
      setSelectedUser(targetUserId);
      setIsCallActive(true);

      // Wait a bit for state to update before setting video source
      setTimeout(() => {
        if (myVideo.current && currentStream) {
          myVideo.current.srcObject = currentStream;
          myVideo.current.muted = true;
          myVideo.current.volume = 0;
          
          // Ensure video plays
          myVideo.current.play().catch(e => {
            console.log("Video play failed:", e);
          });
        }
      }, 100);

       currentStream.getAudioTracks().forEach(track => (track.enabled = true));
      setIsSidebarOpen(false);
      console.log("calling to :" , showReciverDetail._id);

      // ✅ Create a new Peer connection (WebRTC) as the call initiator
      const peer = new Peer({
          initiator: true, // ✅ This user starts the call
          trickle: false, // ✅ Prevents trickling of ICE candidates, ensuring a single signal exchange
          stream:currentStream // ✅ Attach the local media stream
      })

      // ✅ Handle the "signal" event (this occurs when the WebRTC handshake is initiated)
      peer.on("signal", (data)=>{
        // ✅ Emit a "callToUser" event to the server with necessary call details
        socket.emit("callToUser",{
          callToUserId: showReciverDetail._id,
          signalData: data,
          from: me,
          name: user.username,
          profilepic:user.profilepic
        })
      })

      connectionRef.current = peer

    } catch (error) {
      console.log("Error accessing media device:", error);
      alert("Unable to access camera/microphone. Please check permissions.");
      setIsCallActive(false);
      setSelectedUser(null);
    }
  };

  // Effect to handle video element updates when stream changes
  useEffect(() => {
    if (stream && myVideo.current && isCallActive) {
      console.log("Updating video element with stream");
      myVideo.current.srcObject = stream;
      myVideo.current.muted = true;
      myVideo.current.volume = 0;
      
      myVideo.current.play().catch(e => {
        console.log("Video play failed:", e);
      });
    }
  }, [stream, isCallActive]);

  const filteredUsers = users.filter(
    (u) =>
      // Exclude current logged-in user
      u._id !== user?._id &&
      ((u.username?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (u.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()))
  );

  const handleSelectedUser = (selectedUserData) => {
    console.log("Selected User:", selectedUserData);
    setShowReciverDetail(selectedUserData);
    setShowReciverDetailPopUp(true);
  };

  const handleLogout = async () => {
    try {
      // Stop video stream before logout
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      await apiClient.post("/auth/logout");
      socket.off("disconnect");
      socket.disconnect();
      SocketContext.setSocket();
      updateUser(null);
      localStorage.removeItem("userData");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleCallStart = async () => {
    if (showReciverDetail?._id) {
      await startCall(showReciverDetail._id);
      setShowReciverDetailPopUp(false);
    }
  };

  const handleCallEnd = () => {
    console.log("Ending call");
    
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log("Stopping track:", track.kind);
        track.stop();
      });
      setStream(null);
    }
    
    if (myVideo.current) {
      myVideo.current.srcObject = null;
    }
    
    setSelectedUser(null);
    setIsCallActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
                filteredUsers.map((userItem) => (
                  <div
                    key={userItem._id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                      selectedUser === userItem._id && isCallActive
                        ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
                        : "bg-white/60 backdrop-blur-sm border border-blue-200/30 hover:bg-white hover:border-blue-300 hover:shadow-md hover:shadow-blue-200/30"
                    }`}
                    onClick={() => handleSelectedUser(userItem)}
                  >
                    <div className="relative">
                      {userItem.profilepic ? (
                        <>
                          <img
                            src={userItem.profilepic}
                            alt={`${userItem.username}'s profile`}
                            className={`w-12 h-12 rounded-full border-2 ${
                              selectedUser === userItem._id && isCallActive
                                ? "border-white"
                                : "border-blue-200"
                            } transition-all duration-300`}
                          />
                          {isOnlineUser(userItem._id) && (
                            <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-lg animate-bounce"></span>
                          )}
                        </>
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-base transition-all duration-300 relative ${
                            selectedUser === userItem._id && isCallActive
                              ? "bg-white text-blue-600 border-white"
                              : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-blue-200"
                          }`}
                        >
                          {userItem.username?.charAt(0)?.toUpperCase() || "U"}
                          {isOnlineUser(userItem._id) && (
                            <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-lg"></span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                      <span
                        className={`font-semibold text-sm truncate ${
                          selectedUser === userItem._id && isCallActive
                            ? "text-white"
                            : "text-gray-800"
                        }`}
                      >
                        {userItem.username}
                      </span>
                      <span
                        className={`text-xs truncate ${
                          selectedUser === userItem._id && isCallActive
                            ? "text-blue-100"
                            : "text-gray-500"
                        }`}
                      >
                        {userItem.email}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Logout */}
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
            isSidebarOpen ? "md:ml-80" : "ml-0"
          }`}
        >
          {/* Sidebar Toggle Button */}
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

          {/* Welcome */}
          <div className="max-w-4xl mx-auto">
            {isCallActive && stream ? (
              <div className="relative">
                {/* Video Call Interface */}
                <div className="fixed bottom-4 right-4 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
                  <video
                    ref={myVideo}
                    autoPlay
                    playsInline
                    muted
                    className="w-48 h-36 md:w-64 md:h-48 object-cover bg-black"
                    onLoadedMetadata={() => console.log("Video metadata loaded")}
                    onCanPlay={() => console.log("Video can play")}
                    onError={(e) => console.log("Video error:", e)}
                  />
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    You
                  </div>
                  <button
                    onClick={handleCallEnd}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>

                {/* Call Status */}
                <div className="bg-white/80 backdrop-blur-sm border border-blue-200/50 p-6 rounded-xl shadow-lg shadow-blue-200/30">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    📞 In Call with {users.find(u => u._id === selectedUser)?.username}
                  </h2>
                  <p className="text-gray-600">
                    Your camera is active. The other user will see your video when they join.
                  </p>
                  <div className="mt-4 text-sm text-gray-500">
                    Stream Status: {stream ? '✅ Active' : '❌ Inactive'}
                  </div>
                </div>
              </div>
            ) : (
              <div>
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
              </div>
            )}
          </div>

          {/* User Details Popup */}
          {showReciverDetailPopUp && showReciverDetail && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/80 backdrop-blur-3xl border border-blue-200/50 rounded-2xl shadow-2xl shadow-blue-200/50 max-w-sm w-full p-8 relative">
                {/* Close Button */}
                <button
                  onClick={() => setShowReciverDetailPopUp(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 p-2 rounded-full transition-all duration-300"
                >
                  <FaTimes size={16} />
                </button>

                {/* User Info */}
                <div className="flex flex-col items-center text-center">
                  {/* Profile Picture */}
                  <div className="relative mb-4">
                    {showReciverDetail?.profilepic ? (
                      <img
                        src={showReciverDetail.profilepic}
                        alt={`${showReciverDetail.username}'s profile`}
                        className="w-20 h-20 rounded-full border-3 border-blue-200/50 shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold border-3 border-blue-200/50 shadow-lg">
                        {showReciverDetail?.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    {/* Online Status */}
                    {isOnlineUser(showReciverDetail._id) && (
                      <span className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 border-3 border-white rounded-full shadow-lg flex items-center justify-center">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      </span>
                    )}
                  </div>

                  {/* User Details */}
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-1">
                      {showReciverDetail?.username}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {showReciverDetail?.email}
                    </p>
                    {isOnlineUser(showReciverDetail._id) && (
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">Online</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={handleCallStart}
                      disabled={isCallActive}
                      className={`flex-1 ${
                        isCallActive 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                      } text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-green-500/30 active:scale-98`}
                    >
                      <FaPhoneAlt size={16} />
                      {isCallActive ? 'In Call' : 'Call'}
                    </button>
                    <button
                      onClick={() => setShowReciverDetailPopUp(false)}
                      className="flex-1 bg-white/60 backdrop-blur-sm border border-gray-200/50 text-gray-600 px-6 py-3 rounded-xl font-medium hover:bg-white hover:border-gray-300 transition-all duration-300 shadow-lg hover:shadow-gray-200/30 active:scale-98"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;