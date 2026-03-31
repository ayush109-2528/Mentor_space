// frontend/app/session/[id]/page.jsx
"use client";

import { useEffect, useRef, useState, use } from 'react';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, UserCheck, UserX, Send, LogOut } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export default function SessionWorkspace({ params }) {
  // Unwrap params for Next.js 15+ App Router
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const userEmail = searchParams.get('email') || 'Anonymous';
  
  const isHost = role === 'host';
  const isMaster = role === 'master';
  const hasAdminPrivileges = isHost || isMaster;

  // Connection & Media States
  const [socket, setSocket] = useState(null);
  const [code, setCode] = useState("// Waiting to connect...");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  // Waiting Room States
  const [isAdmitted, setIsAdmitted] = useState(hasAdminPrivileges);
  const [joinRequests, setJoinRequests] = useState([]);
  const [partnerSocketId, setPartnerSocketId] = useState(null);

  // Chat States
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef(null);

  // WebRTC Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);

    // 1. Join Room Flow
    s.emit('join-room', { roomId, isHost, isMaster, userEmail });

    s.on('join-request', (request) => setJoinRequests(prev => [...prev, request]));
    s.on('admitted', () => setIsAdmitted(true));
    s.on('denied', () => { alert("Host denied your request."); router.push('/'); });
    s.on('room-error', (msg) => { alert(msg); router.push('/'); });

    // 2. Data Sync
    s.on('code-change', (newCode) => setCode(newCode));
    s.on('receive-message', (msg) => setMessages(prev => [...prev, msg]));

    // 3. Host Remote Controls
    s.on('force-execute', (action) => {
      if (action === 'mute') toggleMedia('audio', true);
      if (action === 'video-off') toggleMedia('video', true);
    });

    // 4. WebRTC Initialization
    const initWebRTC = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peerConnectionRef.current = pc;
        const pendingCandidates = []; 

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) s.emit('ice-candidate', { target: roomId, candidate: event.candidate });
        };

        s.on('user-connected', async (userId) => {
          setPartnerSocketId(userId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          s.emit('offer', { target: userId, caller: s.id, sdp: offer });
        });

        s.on('offer', async (payload) => {
          setPartnerSocketId(payload.caller);
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          s.emit('answer', { target: payload.caller, sdp: answer });
          while (pendingCandidates.length) await pc.addIceCandidate(new RTCIceCandidate(pendingCandidates.shift()));
        });

        s.on('answer', async (payload) => {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          while (pendingCandidates.length) await pc.addIceCandidate(new RTCIceCandidate(pendingCandidates.shift()));
        });

        s.on('ice-candidate', async (candidate) => {
          if (pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(candidate));
          else pendingCandidates.push(candidate);
        });

      } catch (error) {
        console.error("Mic/Cam error:", error);
      }
    };

    if (isAdmitted) initWebRTC();

    return () => {
      s.disconnect();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      peerConnectionRef.current?.close();
    };
  }, [roomId, isHost, isMaster, isAdmitted, userEmail]);

  // Actions
  const handleEditorChange = (value) => {
    if (value !== undefined) {
      setCode(value);
      socket?.emit('code-change', { roomId, code: value });
    }
  };

  const toggleMedia = (type, forceState = null) => {
    if (localStreamRef.current) {
      const track = type === 'audio' ? localStreamRef.current.getAudioTracks()[0] : localStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = forceState !== null ? !forceState : !track.enabled;
        if (type === 'audio') setIsMuted(!track.enabled);
        if (type === 'video') setIsVideoOff(!track.enabled);
      }
    }
  };

  const handleRequest = (socketId, approved) => {
    if (approved) socket.emit('admit-user', { roomId, socketId });
    else socket.emit('deny-user', { socketId });
    setJoinRequests(prev => prev.filter(req => req.socketId !== socketId));
  };

  const forceRemoteAction = (action) => {
    if (partnerSocketId) socket.emit('force-action', { targetId: partnerSocketId, action });
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('send-message', { roomId, message: chatInput, senderEmail: userEmail });
    setChatInput("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (socket) socket.disconnect();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
    if (peerConnectionRef.current) peerConnectionRef.current.close();
    router.push('/');
  };

  const leaveSession = () => {
    if (socket) socket.disconnect();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
    if (peerConnectionRef.current) peerConnectionRef.current.close();
    router.push('/');
  };

  // Waiting Room UI
  if (!isAdmitted) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold mb-2">Waiting Room</h2>
        <p className="text-slate-400">Please wait, the host will let you in soon...</p>
      </div>
    );
  }

  // Main Workspace UI
  return (
    <div className="h-screen w-full bg-[#0f111a] text-white flex flex-col md:flex-row overflow-hidden font-sans">
      
      {/* LEFT: Editor & Top Nav */}
      <div className="flex-1 flex flex-col min-w-0 relative border-r border-[#2a2f42]">
        
        {/* Workspace Header */}
        <div className="h-14 bg-[#161925] border-b border-[#2a2f42] flex items-center justify-between px-6">
          <div>
            <h1 className="text-sm font-semibold text-slate-200">
              {isMaster ? "🛡️ Master Workspace" : isHost ? "👑 Host Workspace" : "Student Workspace"}
            </h1>
            <p className="text-xs text-slate-500 font-mono">{roomId}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-md border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-xs font-bold tracking-wider">LIVE</span>
            </div>
            
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 text-slate-400 hover:text-rose-400 transition-colors bg-[#0f111a] px-3 py-1 rounded-md border border-[#2a2f42] hover:border-rose-500/30"
              title="Log Out completely"
            >
              <LogOut size={16} />
              <span className="text-xs font-bold tracking-wider hidden sm:inline">LOGOUT</span>
            </button>
          </div>
        </div>

        {/* Join Requests Notification */}
        {hasAdminPrivileges && joinRequests.length > 0 && (
          <div className="absolute top-16 right-4 z-50 w-80 space-y-2">
            {joinRequests.map((req) => (
              <div key={req.socketId} className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-2xl flex flex-col gap-3">
                <p className="text-sm"><strong>{req.userEmail}</strong> wants to join.</p>
                <div className="flex gap-2">
                  <button onClick={() => handleRequest(req.socketId, true)} className="flex-1 bg-emerald-600 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-500 flex items-center justify-center">
                    <UserCheck size={16} className="mr-1"/> Admit
                  </button>
                  <button onClick={() => handleRequest(req.socketId, false)} className="flex-1 bg-rose-600 py-1.5 rounded-lg text-sm font-medium hover:bg-rose-500 flex items-center justify-center">
                    <UserX size={16} className="mr-1"/> Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Editor Container */}
        <div className="flex-1 bg-[#0f111a]">
          <Editor 
            height="100%" 
            defaultLanguage="javascript" 
            theme="vs-dark" 
            value={code} 
            onChange={handleEditorChange} 
            options={{ minimap: { enabled: false }, fontSize: 15, padding: { top: 20 } }} 
          />
        </div>
      </div>

      {/* RIGHT: Video, Chat & Controls */}
      <div className="w-full md:w-[380px] flex flex-col bg-[#161925] shrink-0 h-screen">
        
        {/* Videos Section */}
        <div className="p-4 space-y-3 shrink-0">
          <div className="relative w-full aspect-video bg-[#0f111a] rounded-lg overflow-hidden border border-[#2a2f42] group">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs backdrop-blur-sm">Partner</div>
            
            {hasAdminPrivileges && partnerSocketId && (
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => forceRemoteAction('mute')} className="bg-red-500/80 hover:bg-red-500 p-1.5 rounded text-xs font-bold shadow backdrop-blur-sm" title="Force Mute Partner">
                  <MicOff size={14}/>
                </button>
                <button onClick={() => forceRemoteAction('video-off')} className="bg-red-500/80 hover:bg-red-500 p-1.5 rounded text-xs font-bold shadow backdrop-blur-sm" title="Force Video Off Partner">
                  <VideoOff size={14}/>
                </button>
              </div>
            )}
          </div>

          <div className="relative w-2/3 ml-auto aspect-video bg-[#0f111a] rounded-lg overflow-hidden border border-[#2a2f42]">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs backdrop-blur-sm">You</div>
          </div>
        </div>

        {/* Chat Section */}
        <div className="flex-1 flex flex-col border-t border-[#2a2f42] min-h-0 bg-[#0f111a]">
          <div className="px-4 py-2 bg-[#161925] border-b border-[#2a2f42] text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
            <span>Session Chat</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, idx) => {
              const isMe = msg.senderEmail === userEmail;
              return (
                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-slate-500 mb-1 px-1">
                    {msg.senderEmail.split('@')[0]} • {msg.timestamp}
                  </span>
                  <div className={`px-3 py-2 text-sm max-w-[85%] break-words shadow-sm ${
                    isMe 
                      ? 'bg-emerald-600 text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-[#161925] text-slate-200 rounded-2xl rounded-tl-sm border border-[#2a2f42]'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={sendChatMessage} className="p-3 bg-[#161925] border-t border-[#2a2f42] flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Message..."
              className="flex-1 bg-[#0f111a] border border-[#2a2f42] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-slate-200 transition-colors"
            />
            <button 
              type="submit" 
              className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-emerald-600" 
              disabled={!chatInput.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </div>

        {/* Local Call Controls */}
        <div className="p-4 bg-[#161925] border-t border-[#2a2f42] flex justify-center gap-4 shrink-0">
          <button onClick={() => toggleMedia('audio')} className={`p-3 rounded-full transition-all duration-200 ${isMuted ? 'bg-rose-500 shadow-lg shadow-rose-500/20' : 'bg-[#2a2f42] hover:bg-[#32384e]'}`}>
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button onClick={() => toggleMedia('video')} className={`p-3 rounded-full transition-all duration-200 ${isVideoOff ? 'bg-rose-500 shadow-lg shadow-rose-500/20' : 'bg-[#2a2f42] hover:bg-[#32384e]'}`}>
            {isVideoOff ? <VideoOff size={20} /> : <VideoIcon size={20} />}
          </button>
          <button onClick={leaveSession} className="p-3 bg-rose-600 hover:bg-rose-500 rounded-full transition-all duration-200 shadow-lg shadow-rose-600/20" title="Leave call">
            <PhoneOff size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}