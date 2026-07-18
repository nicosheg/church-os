import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const churchId = 'demo-church';

  useEffect(() => {
    fetch(`/api/dashboard?church_id=${churchId}`)
      .then(r => r.json())
      .then(setStats);
  }, []);

  const startFollowUpCalls = async () => {
    const res = await fetch('/api/trigger-followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ church_id: churchId }),
    });
    const data = await res.json();
    alert(data.message || 'Follow‑up calls started');
  };

  if (!stats) return <p>Loading...</p>;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      {/* Navigation */}
      <nav style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 20,
        marginBottom: 30,
        borderBottom: '1px solid #eee',
        paddingBottom: 15,
      }}>
        <a href="/" style={navLinkStyle(true)}>📊 Dashboard</a>
        <a href="/section" style={navLinkStyle()}>✅ Section Attendance</a>
        <a href="/scan" style={navLinkStyle()}>📷 Scan</a>
        <a href="/members" style={navLinkStyle()}>👥 Members</a>
        <a href="/call-script" style={navLinkStyle()}>📝 Call Script</a>
      </nav>

      <h1>Secretary Dashboard</h1>
      <p style={{ fontSize: 18, color: '#666' }}>{today}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15, marginTop: 20 }}>
        <Card label="Present Today" value={stats.present_count} color="#4CAF50" />
        <Card label="Absent" value={stats.absent_count} color="#f44336" />
        <Card label="Calls Completed" value={stats.calls_completed} />
        <Card label="Prayer Requests" value={stats.prayer_requests} color="#2196F3" />
        <Card label="Needs Pastor" value={stats.needs_pastor} color="#ff9800" />
        <Card label="Wrong Numbers" value={stats.wrong_numbers} color="#9e9e9e" />
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 15 }}>
        <a href="/section" style={actionButtonStyle}>
          ✅ Section Attendance
        </a>
        <a href="/call-script" style={actionButtonStyle}>
          📝 Edit Call Script
        </a>
        <button onClick={startFollowUpCalls} style={actionButtonStyle}>
          📞 Start Follow‑up Calls
        </button>
      </div>
    </div>
  );
}

function Card({ label, value, color = '#333' }) {
  return (
    <div style={{
      border: '1px solid #ddd',
      padding: 20,
      borderRadius: 10,
      minWidth: 140,
      backgroundColor: '#fff',
    }}>
      <h3 style={{ margin: 0, fontSize: 14, color: '#666' }}>{label}</h3>
      <p style={{ fontSize: 32, fontWeight: 'bold', margin: '8px 0 0', color }}>{value}</p>
    </div>
  );
}

function navLinkStyle(active = false) {
  return {
    textDecoration: 'none',
    color: active ? '#4F46E5' : '#333',
    fontWeight: active ? 'bold' : 'normal',
    fontSize: 16,
  };
}

const actionButtonStyle = {
  padding: '14px 24px',
  backgroundColor: '#4F46E5',
  color: '#fff',
  borderRadius: 10,
  textDecoration: 'none',
  display: 'inline-block',
  fontWeight: 'bold',
  border: 'none',
  cursor: 'pointer',
  fontSize: 16,
};
