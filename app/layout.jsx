// frontend/app/layout.jsx
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'MentorSpace | Live 1-on-1 Mentorship',
  description: 'Real-time collaborative code editor with WebRTC video and chat.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#0f111a] text-slate-200 antialiased selection:bg-emerald-500/30">
        {children}
        
        {/* Global Toast Notifications */}
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            style: {
              background: '#161925',
              color: '#fff',
              border: '1px solid #2a2f42',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#f43f5e', secondary: '#fff' },
            },
          }} 
        />
      </body>
    </html>
  );
}