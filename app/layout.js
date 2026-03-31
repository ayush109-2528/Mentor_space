import './globals.css';

export const metadata = {
  title: 'MentorSpace | Live 1-on-1 Mentorship',
  description: 'Real-time collaborative code editor with WebRTC video and chat.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#0f111a] text-slate-200 antialiased selection:bg-emerald-500/30">
        {children}
      </body>
    </html>
  );
}