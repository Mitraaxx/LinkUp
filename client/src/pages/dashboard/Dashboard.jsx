import React, { useEffect, useRef, useState } from "react";
import {
  FaDoorClosed,
  FaTimes,
  FaSearch,
  FaBars,
  FaPhoneAlt,
  FaPhoneSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import { useUser } from "../../context/userContext";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../apiClient";
import SocketContext from "../socket/SocketContext";
import Peer from "simple-peer";

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
  const [reciveingCall, setReciveingCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callRejectedPopUp, setCallRejectedPopUp] = useState(false);
  const [callRejectedUser, setCallRejectedUser] = useState(null);
  const reciverVideo = useRef();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

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

    socket.on("callToUser", (data) => {
      setReciveingCall(true);
      setCaller(data);
      setCallerSignal(data.signal);
    });

    // ✅ Fixed: Listen for both "callEnded" and "call-ended" events
    socket.on("callEnded", (data) => {
      console.log("Call ended by", data.name);
      endCallCleanup();
    });

    socket.on("call-ended", (data) => {
      console.log("Call ended by", data.name);
      endCallCleanup();
    });

    socket.on("callRejected", (data) => {
      setCallRejectedPopUp(true);
      setCallRejectedUser(data);
    });

    // ✅ New: Handle peer connection termination
    socket.on("peer-disconnected", (data) => {
      console.log("Peer disconnected:", data);
      endCallCleanup();
    });

    return () => {
      socket.off("me");
      socket.off("online-users");
      socket.off("callToUser");
      socket.off("callEnded");
      socket.off("call-ended"); // ✅ Clean up the new event listener
      socket.off("callRejected");
      socket.off("peer-disconnected"); // ✅ Clean up peer disconnect listener
    };
  }, [user, socket]);

  console.log("getting call from", caller);
  console.log("Online Users State:", onlineUsers);

  const isOnlineUser = (userId) => onlineUsers.some((u) => u.userId === userId);

  const allusers = async () => {
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
    if (user?._id) {
      allusers();
    }
  }, [user]);

  const startCall = async (targetUserId) => {
    try {
      console.log("Starting call with user:", targetUserId);

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log("Stream created:", currentStream);
      currentStream.getAudioTracks().forEach((track) => (track.enabled = true));

      setStream(currentStream);
      setSelectedUser(targetUserId);
      setIsCallActive(true);

      setTimeout(() => {
        if (myVideo.current && currentStream) {
          myVideo.current.srcObject = currentStream;
          myVideo.current.muted = false;
          myVideo.current.volume = 0;
          myVideo.current.play().catch((e) => {
            console.log("Video play failed:", e);
          });
        }
      }, 100);

      setCallRejectedPopUp(false);
      setIsSidebarOpen(false);
      setSelectedUser(showReciverDetail._id);
      console.log("calling to :", showReciverDetail._id);

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: currentStream,
      });

      peer.on("signal", (data) => {
        socket.emit("callToUser", {
          callToUserId: showReciverDetail._id,
          signalData: data,
          from: me,
          name: user.username,
          profilepic: user.profilepic,
        });
      });

      peer.on("stream", (remoteStream) => {
        if (reciverVideo.current) {
          reciverVideo.current.srcObject = remoteStream;
          reciverVideo.current.muted = false;
          reciverVideo.current.volume = 1.0;
        }

        const playPromise = reciverVideo.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Remote video playing");
              setTimeout(() => {
                reciverVideo.current.muted = false;
              }, 500);
            })
            .catch((error) => {
              console.log("Remote video play failed:", error);
            });
        }
      });

      // ✅ Handle peer connection close/error events
      peer.on("close", () => {
        console.log("Peer connection closed");
        endCallCleanup();
      });

      peer.on("error", (err) => {
        console.log("Peer connection error:", err);
        endCallCleanup();
      });

      socket.once("callAccepted", (data) => {
        setCallRejectedPopUp(false);
        setCallAccepted(true);
        setCaller(data.from);
        peer.signal(data.signal);
      });

      connectionRef.current = peer;
      setShowReciverDetailPopUp(false);
    } catch (error) {
      console.log("Error accessing media device:", error);
      alert("Unable to access camera/microphone. Please check permissions.");
      setIsCallActive(false);
      setSelectedUser(null);
    }
  };

  useEffect(() => {
    if (stream && myVideo.current && isCallActive) {
      console.log("Updating video element with stream");
      myVideo.current.srcObject = stream;
      myVideo.current.muted = true;
      myVideo.current.volume = 0;

      myVideo.current.play().catch((e) => {
        console.log("Video play failed:", e);
      });
    }
  }, [stream, isCallActive]);

  const filteredUsers = users.filter(
    (u) =>
      u._id !== user?._id &&
      ((u.username?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (u.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()))
  );

  const handleSelectedUser = (selectedUserData) => {
    console.log("Selected User:", selectedUserData);
    setShowReciverDetail(selectedUserData);
    setShowReciverDetailPopUp(true);
  };

  const handleacceptCall = async () => {
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setStream(currentStream);
      setCallAccepted(true);
      setReciveingCall(false);
      setIsSidebarOpen(false);
      setIsCallActive(true); // ✅ Set call as active

      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
        myVideo.current.muted = true;
        myVideo.current.volume = 0;
      }

      currentStream.getAudioTracks().forEach((track) => (track.enabled = true));

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: currentStream,
      });

      peer.on("signal", (data) => {
        socket.emit("answeredCall", {
          signal: data,
          from: me,
          to: caller.from,
        });
      });

      peer.on("stream", (remoteStream) => {
        console.log("Received remote stream:", remoteStream);
        if (reciverVideo.current) {
          reciverVideo.current.srcObject = remoteStream;
          reciverVideo.current.muted = false;
          reciverVideo.current.volume = 1.0;

          const playPromise = reciverVideo.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("Remote video playing");
                setTimeout(() => {
                  reciverVideo.current.muted = false;
                }, 500);
              })
              .catch((error) => {
                console.log("Remote video play failed:", error);
              });
          }
        }
      });

      // ✅ Handle peer connection close/error events
      peer.on("close", () => {
        console.log("Peer connection closed");
        endCallCleanup();
      });

      peer.on("error", (err) => {
        console.log("Peer connection error:", err);
        endCallCleanup();
      });

      peer.signal(callerSignal);
      connectionRef.current = peer;
    } catch (error) {
      console.log("Error in accepting call:", error);
      alert("Unable to access camera/microphone. Please check permissions.");
    }
  };

  const handlerejectCall = () => {
    setReciveingCall(false);
    setCallAccepted(false);
    socket.emit("reject-call", {
      to: caller.from,
      name: user.username,
      profilepic: user.profilepic,
    });
  };

  // ✅ Enhanced cleanup function
  const endCallCleanup = () => {
    console.log("Cleaning up call...");

    // Stop all media tracks
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped track:", track.kind);
      });
    }

    // Clear video elements properly
    if (reciverVideo.current) {
      reciverVideo.current.srcObject = null;
      reciverVideo.current.pause();
    }
    if (myVideo.current) {
      myVideo.current.srcObject = null;
      myVideo.current.pause();
    }

    // Destroy peer connection
    if (connectionRef.current) {
      try {
        connectionRef.current.destroy();
      } catch (err) {
        console.log("Error destroying peer:", err);
      }
      connectionRef.current = null;
    }

    // Reset all call-related states
    setStream(null);
    setReciveingCall(false);
    setCallAccepted(false);
    setSelectedUser(null);
    setIsCallActive(false);
    setCaller(null);
    setCallerSignal(null);
    setShowReciverDetailPopUp(false);
    setShowReciverDetail(null);
    setIsSidebarOpen(true); // ✅ Show sidebar again

    console.log("Call cleanup completed");
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCamOn;
        setIsCamOn(videoTrack.enabled);
      }
    }
  };

  const handleLogout = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
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

  // ✅ Enhanced call end function
  const handleCallEnd = () => {
    console.log("Ending call...");

    // ✅ Determine who to send the end call signal to
    let targetUser = null;
    if (caller?.from) {
      targetUser = caller.from; // If we received the call
    } else if (selectedUser) {
      targetUser = selectedUser; // If we initiated the call
    } else if (showReciverDetail?._id) {
      targetUser = showReciverDetail._id; // Fallback
    }

    // ✅ Emit call end to the other user
    if (targetUser) {
      socket.emit("call-ended", {
        to: targetUser,
        from: me,
        name: user.username,
        userId: user._id,
      });
    }

    // ✅ Also emit a peer disconnect signal
    socket.emit("peer-disconnected", {
      to: targetUser,
      from: me,
      name: user.username,
    });

    // Clean up locally
    endCallCleanup();
  };
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
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
          className={`bg-white/70 backdrop-blur-3xl border border-blue-200/50 text-gray-800 w-80 h-screen p-6 space-y-6 fixed z-20 transition-transform shadow-3xl shadow-blue-200/50 flex flex-col
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            ${
              isSidebarOpen ? "w-full sm:w-80" : ""
            } // Added for better mobile experience if not already present
          `}
        >
          {/* Header */}
<div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
    <div>
      <h1 className="text-xl sm:text-2xl font-light bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent tracking-wide leading-tight">
        Users
      </h1>
      <p className="text-sm text-blue-600 font-light leading-relaxed tracking-wide">LinkUp</p>
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
      className="w-full bg-transparent text-blue-800 placeholder-blue-500 focus:outline-none focus:placeholder-blue-600 transition-colors duration-300 text-sm font-light leading-relaxed"
    />
  </div>
</div>

{/* User List */}
<div className="flex-1 overflow-hidden">
  <div className="h-full overflow-y-auto space-y-3 pr-2">
    {loading ? (
      <div className="flex items-center justify-center p-4">
        <div className="text-blue-600 text-sm font-light tracking-wide">Loading users...</div>
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
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-light text-base transition-all duration-300 relative ${
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
              className={`font-light text-sm truncate tracking-wide ${
                selectedUser === userItem._id && isCallActive
                  ? "text-white"
                  : "text-blue-800"
              }`}
            >
              {userItem.username}
            </span>
            <span
              className={`text-xs truncate font-light tracking-wide ${
                selectedUser === userItem._id && isCallActive
                  ? "text-blue-100"
                  : "text-blue-500"
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

          ]

          {/* Logout */}
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white p-2.5 cursor-pointer rounded-full font-medium shadow-sm hover:shadow-md hover:shadow-red-500/30 transition-all duration-200 active:scale-95 mb-0 sm:mb-0 mb-20 border border-red-400/20"
            >
              <FaDoorClosed className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </button>
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
            {(isCallActive && stream) || reciveingCall || callAccepted ? (
              <div className="relative w-full h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 overflow-hidden">
                {/* Minimal background elements */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-200/10 to-cyan-100/10"></div>

                {/* Remote video (larger, full focus) */}
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="w-full h-full bg-white/5 backdrop-blur-sm rounded-none overflow-hidden">
                    <video
                      ref={reciverVideo}
                      autoPlay
                      playsInline
                      webkit-playsinline="true"
                      muted={false}
                      className="w-full h-full object-cover"
                      onLoadedMetadata={() =>
                        console.log("Remote video metadata loaded")
                      }
                      onCanPlay={() => console.log("Remote video can play")}
                      onError={(e) => console.log("Remote video error:", e)}
                    />
                  </div>
                </div>

                {/* Minimal top bar */}
                <div className="absolute top-4 left-4 right-4 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Mobile menu button */}
                      <button
                        type="button"
                        className="md:hidden bg-black/20 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-black/30 transition-all duration-200"
                        onClick={() => setIsSidebarOpen(true)}
                      >
                        <FaBars size={16} />
                      </button>

                      {/* Caller name - minimal */}
                      <div className="bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                        <span className="text-white text-sm font-medium">
                          {caller?.name || selectedUser?.username || "In Call"}
                        </span>
                      </div>
                    </div>

                    {/* Connection status - minimal */}
                    <div className="bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-white text-xs">Connected</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Local video (smaller, corner) */}
                <div className="fixed bottom-20 right-4 z-20">
                  <div className="relative bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden shadow-lg">
                    <video
                      ref={myVideo}
                      autoPlay
                      playsInline
                      webkit-playsinline="true"
                      muted
                      className="w-32 h-24 md:w-40 md:h-30 object-cover"
                      onLoadedMetadata={() =>
                        console.log("Local video metadata loaded")
                      }
                      onCanPlay={() => console.log("Local video can play")}
                      onError={(e) => console.log("Local video error:", e)}
                    />

                    {/* Simple "You" label */}
                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                      You
                    </div>
                  </div>
                </div>

                {/* Minimal Call Controls */}
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30">
                  <div className="bg-black/30 backdrop-blur-sm rounded-full p-2 shadow-lg">
                    <div className="flex items-center gap-2">
                      {/* End Call Button - Smaller */}
                      <button
                        type="button"
                        className="bg-red-500 hover:bg-red-600 p-3 rounded-full text-white shadow-md transition-all duration-200 active:scale-95"
                        onClick={() => {
                          console.log("End call button clicked");
                          // Emit call end to other user
                          socket.emit("callEnded", {
                            to: caller?.from || selectedUser?._id,
                            name: user.username,
                          });
                          // Clean up locally
                          endCallCleanup();
                        }}
                      >
                        <FaPhoneSlash size={16} />
                      </button>

                      {/* Toggle Microphone - Smaller */}
                      <button
                        type="button"
                        onClick={toggleMic}
                        className={`p-3 rounded-full text-white shadow-md transition-all duration-200 active:scale-95 ${
                          isMicOn
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-gray-500 hover:bg-gray-600"
                        }`}
                      >
                        {isMicOn ? (
                          <FaMicrophone size={16} />
                        ) : (
                          <FaMicrophoneSlash size={16} />
                        )}
                      </button>

                      {/* Toggle Camera - Smaller */}
                      <button
                        type="button"
                        onClick={toggleCam}
                        className={`p-3 rounded-full text-white shadow-md transition-all duration-200 active:scale-95 ${
                          isCamOn
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-gray-500 hover:bg-gray-600"
                        }`}
                      >
                        {isCamOn ? (
                          <FaVideo size={16} />
                        ) : (
                          <FaVideoSlash size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Your existing welcome content
              <div>
                <div className="space-y-4 px-3 sm:px-6">
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-4 sm:mb-6 bg-white/90 backdrop-blur-sm border border-blue-200/60 p-5 sm:p-7 rounded-xl shadow-lg shadow-blue-200/20">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl flex-shrink-0 shadow-sm">
                      👋
                    </div>
                    <div className="text-center sm:text-left">
                      <h1 className="text-xl sm:text-3xl font-light text-blue-900 tracking-wide leading-tight mb-1">
                        Hey{" "}
                        <span className="font-normal text-blue-700">
                          {user?.username || "Guest"}
                        </span>
                        !
                      </h1>
                      <p className="text-sm sm:text-lg text-blue-600 font-light leading-relaxed">
                        Ready to{" "}
                        <span className="font-medium text-blue-700">
                          connect with friends instantly?
                        </span>{" "}
                        Just{" "}
                        <span className="font-medium text-blue-700">
                          select a user
                        </span>{" "}
                        and start your video call.
                      </p>
                    </div>
                  </div>

                  {/* Instructions Section - Refined Combo */}
                  <div className="bg-white/90 backdrop-blur-sm border border-blue-200/60 p-5 sm:p-7 rounded-xl shadow-lg shadow-blue-200/20">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      <h2 className="text-base sm:text-lg font-light text-blue-900 tracking-wide">
                        HOW TO START A VIDEO CALL
                      </h2>
                      <div className="h-px bg-blue-200 flex-1"></div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-blue-50/50 transition-all duration-200 border-l border-blue-200">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                          <span className="text-xs font-light text-blue-400 tracking-widest">
                            01
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-blue-500 text-lg">📌</span>
                            <p className="text-sm sm:text-base font-light text-blue-800 leading-relaxed">
                              Open the sidebar to see online users
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-blue-50/50 transition-all duration-200 border-l border-blue-200">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                          <span className="text-xs font-light text-blue-400 tracking-widest">
                            02
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-blue-500 text-lg">🔍</span>
                            <p className="text-sm sm:text-base font-light text-blue-800 leading-relaxed">
                              Use the search bar to find a specific person
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-blue-50/50 transition-all duration-200 border-l border-blue-200">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                          <span className="text-xs font-light text-blue-400 tracking-widest">
                            03
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-blue-500 text-lg">🎥</span>
                            <p className="text-sm sm:text-base font-light text-blue-800 leading-relaxed">
                              Click on a user to start a video call instantly
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <p className="text-xs sm:text-sm font-light text-blue-500 tracking-wide">
                          READY TO CONNECT
                        </p>
                      </div>
                    </div>
                  </div>
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
                        {showReciverDetail?.username
                          ?.charAt(0)
                          ?.toUpperCase() || "U"}
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
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                      {showReciverDetail?.username}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {showReciverDetail?.email}
                    </p>
                    {isOnlineUser(showReciverDetail._id) && (
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">
                          Online
                        </span>
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
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                      } text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-green-500/30 active:scale-98 text-sm`}
                    >
                      <FaPhoneAlt size={16} />
                      {isCallActive ? "In Call" : "Call"}
                    </button>
                    <button
                      onClick={() => setShowReciverDetailPopUp(false)}
                      className="flex-1 bg-white/60 backdrop-blur-sm border border-gray-200/50 text-gray-600 px-6 py-3 rounded-xl font-medium hover:bg-white hover:border-gray-300 transition-all duration-300 shadow-lg hover:shadow-gray-200/30 active:scale-98 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reciveingCall && !callAccepted && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/80 backdrop-blur-3xl border border-blue-200/50 rounded-2xl shadow-2xl shadow-blue-200/50 max-w-sm w-full p-8 relative">
                {/* Incoming Call Indicator */}
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    <p className="text-base font-semibold text-gray-800 mb-4">
                      Incoming Call...
                    </p>
                  </div>

                  {/* Profile Picture */}
                  <div className="relative mb-4">
                    {caller?.profilepic ? (
                      <img
                        src={caller.profilepic}
                        alt={`${caller.name}'s profile`}
                        className="w-20 h-20 rounded-full border-3 border-blue-200/50 shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold border-3 border-blue-200/50 shadow-lg">
                        {caller?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    {/* Animated ring effect */}
                    <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-ping"></div>
                  </div>

                  {/* Caller Details */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                      {caller?.name}
                    </h3>
                    <p className="text-xs text-gray-500">{caller?.email}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 w-full">
                    <button
                      type="button"
                      onClick={handleacceptCall}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-green-500/30 active:scale-98 text-sm"
                    >
                      <FaPhoneAlt size={16} />
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={handlerejectCall}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-red-500/30 active:scale-98 text-sm"
                    >
                      <FaPhoneSlash size={16} />
                      Reject
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
