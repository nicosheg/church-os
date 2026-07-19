import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Layout({ children }) {
  const router = useRouter();

  return (
    <>
      {/* Animated Background */}
      <div style={bgStyle} />

      {/* Top Navigation */}
      <nav style={navStyle}>
        <Link href="/" style={router.pathname === '/' ? activeLink : link}>📊 Dashboard</Link>
        <Link href="/scan" style={router.pathname === '/scan' ? activeLink : link}>📷 Scan</Link>
        <Link href="/members" style={router.pathname === '/members' ? activeLink : link}>👥 Members</Link>
        <Link href="/session" style={router.pathname === '/session' ? activeLink : link}>📋 New Session</Link>
      </nav>

      {/* Page Content */}
      <main style={{ position: 'relative', zIndex: 1, paddingBottom: 80, minHeight: '100vh' }}>
        {children}
      </main>

      {/* Premium Footer */}
      <footer style={footerStyle}>
        <span style={{ opacity: 0.7, fontWeight: 400 }}>Intelligence by </span>
        <span style={{ fontWeight: 700, letterSpacing: 1 }}>FIDUCIA</span>
      </footer>
    </>
  );
}

// Moving gradient background
const bgStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: 0,
  background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
  backgroundSize: '400% 400%',
  animation: 'gradientShift 15s ease infinite',
};

// Navigation bar
const navStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 999,
  backdropFilter: 'blur(10px)',
  background: 'rgba(255,255,255,0.7)',
  borderBottom: '1px solid rgba(255,255,255,0.3)',
  padding: '12px 20px',
  display: 'flex',
  justifyContent: 'center',
  gap: 24,
  flexWrap: 'wrap',
};

const link = {
  textDecoration: 'none',
  color: '#333',
  fontWeight: 500,
  fontSize: 16,
  transition: 'color 0.2s',
};

const activeLink = {
  ...link,
  color: '#4F46E5',
  fontWeight: 700,
  borderBottom: '2px solid #4F46E5',
  paddingBottom: 2,
};

// Footer
const footerStyle = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  width: '100%',
  backdropFilter: 'blur(10px)',
  background: 'rgba(20,20,40,0.8)',
  color: '#fff',
  textAlign: 'center',
  padding: '12px 0',
  fontSize: 14,
  zIndex: 1000,
  borderTop: '1px solid rgba(255,255,255,0.1)',
};

// Add the keyframes as a global style (we'll inject it via a <style> tag in _app.js or a custom _document)
// For simplicity, we'll add a <style jsx global> in the Layout (requires next/babel, but we can just add it in _app.js). Since we don't have _app.js, we'll add a global style in index.js or via a separate component. But to keep it simple, I'll instruct to add a global CSS file.
// Actually, better: we'll create a simple global styles file and import it in _app.js. But since we don't have _app.js yet, I'll provide one.
