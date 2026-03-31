// frontend/app/about/page.jsx
import Link from 'next/link';
import { Code2, Video, ShieldCheck, Zap, Users, MessageSquare, ArrowLeft } from 'lucide-react';

export default function AboutPage() {
  const features = [
    { icon: <Code2 className="text-emerald-400" size={24}/>, title: "Real-Time IDE", desc: "Collaborative Monaco code editor with sub-millisecond socket synchronization." },
    { icon: <Video className="text-blue-400" size={24}/>, title: "WebRTC Video", desc: "Peer-to-peer encrypted low-latency video and audio calling built directly into the workspace." },
    { icon: <ShieldCheck className="text-rose-400" size={24}/>, title: "Host Controls", desc: "Secure waiting rooms and the ability to force-mute or disable video for disruptive participants." },
    { icon: <Zap className="text-amber-400" size={24}/>, title: "Master Override", desc: "Global admin privileges allowing instantaneous access to any active session." },
    { icon: <Users className="text-purple-400" size={24}/>, title: "1-on-1 Focused", desc: "Optimized specifically for mentor-student pairs to maximize learning efficiency." },
    { icon: <MessageSquare className="text-pink-400" size={24}/>, title: "Session Chat", desc: "Integrated text chat for sharing links, terminal commands, or quick notes." }
  ];

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-200 font-sans">
      <nav className="border-b border-[#2a2f42] bg-[#161925] sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <Code2 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="font-bold text-lg tracking-wide text-white">MentorSpace</span>
          </div>
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-emerald-400 transition-colors bg-[#0f111a] px-3 py-1.5 rounded-lg border border-[#2a2f42] hover:border-emerald-500/30">
            <ArrowLeft size={16} /> Back to App
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
            The ultimate <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">1-on-1</span> mentoring environment.
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            A fully integrated workspace combining real-time code execution, peer-to-peer video communication, and enterprise-grade host controls. No more switching between Zoom and VS Code.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-[#161925] border border-[#2a2f42] p-8 rounded-2xl hover:border-emerald-500/50 transition-all duration-300 group shadow-lg">
              <div className="mb-4 p-3 bg-[#0f111a] inline-block rounded-xl border border-[#2a2f42] group-hover:scale-110 transition-transform shadow-md">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
              <p className="text-slate-400 leading-relaxed text-sm">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center pb-20">
          <Link href="/">
            <button className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all duration-200">
              Start a Session Now
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}