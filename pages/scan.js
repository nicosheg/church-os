import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function ScanPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [programName, setProgramName] = useState('GIBEON');
  const router = useRouter();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setMessage('');

    const form = new FormData();
    form.append('file', file);
    form.append('church_id', 'demo-church');
    form.append('uploaded_by', 'secretary');
    form.append('program_name', programName.trim() || 'GIBEON');

    try {
      const res = await fetch('/api/attendance/scan', { method: 'POST', body: form });
      const data = await res.json();
      if (data.status === 'ok') {
        setMessage(`✅ Scan complete! ${data.present_count} present (${data.new_members} new members added).`);
        setTimeout(() => router.push('/'), 3000);
      } else {
        setMessage('❌ Error: ' + (data.error || 'Unknown'));
      }
    } catch (err) {
      setMessage('❌ Error: ' + err.message);
    }
    setLoading(false);
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Layout>
      <div style={{ maxWidth: 500, margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Scan Attendance</h1>
        <p style={{ color: '#555', marginBottom: 25 }}>{today}</p>

        <div style={{ marginBottom: 25 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Program / Event Name</label>
          <input
            type="text"
            value={programName}
            onChange={e => setProgramName(e.target.value)}
            placeholder="e.g., GIBEON"
            style={{
              padding: '12px 16px',
              fontSize: 16,
              borderRadius: 12,
              border: '1px solid #ddd',
              width: '100%',
              maxWidth: 280,
              textAlign: 'center',
              backdropFilter: 'blur(5px)',
              background: 'rgba(255,255,255,0.7)',
              outline: 'none',
            }}
          />
        </div>

        <label htmlFor="cameraInput" style={{ cursor: 'pointer', display: 'inline-block' }}>
          <div style={{
            background: loading ? '#999' : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            color: 'white',
            padding: '18px 40px',
            borderRadius: 16,
            fontSize: 20,
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(79,70,229,0.3)',
            transition: 'transform 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            📷 {loading ? 'Processing...' : 'Take Photo of Register'}
          </div>
        </label>
        <input
          id="cameraInput"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        {message && (
          <div style={{ marginTop: 20, padding: 12, background: 'rgba(255,255,255,0.8)', borderRadius: 12, backdropFilter: 'blur(5px)' }}>
            {message}
          </div>
        )}
      </div>
    </Layout>
  );
    }
