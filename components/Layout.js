export default function Layout({ children }) {
  return (
    <>
      <main style={{ minHeight: '100vh', paddingBottom: 60 }}>{children}</main>
      <footer
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          background: 'linear-gradient(90deg, #1a1a2e, #16213e)',
          color: '#fff',
          textAlign: 'center',
          padding: '12px 0',
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: 0.5,
          zIndex: 1000,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.15)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <span style={{ opacity: 0.85 }}>Intelligence by </span>
        <span style={{ fontWeight: 700, opacity: 1 }}>FIDUCIA</span>
        <style jsx>{`
          footer {
            backdrop-filter: blur(10px);
          }
        `}</style>
      </footer>
    </>
  );
    }
