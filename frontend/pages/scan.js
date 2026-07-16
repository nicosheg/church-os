import { useState } from 'react';
import api from '../lib/api';
import { useRouter } from 'next/router';

export default function ScanPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setMessage('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('church_id', 'demo-church');
    formData.append('uploaded_by', 'secretary');

    try {
      const { data } = await api.post('/api/attendance/scan', formData);
      setMessage(`Scan done! ${data.present_count} present, ${data.absent_count} absent.`);
      // Redirect to dashboard after 3 seconds
      setTimeout(() => router.push('/'), 3000);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ textAlign: 'center', paddingTop: 50 }}>
      <h1>Scan Attendance</h1>
      <label htmlFor="cameraInput" style={{ cursor: 'pointer' }}>
        <div style={{
          background: '#4F46E5', color: 'white', padding: '20px 40px',
          borderRadius: 16, fontSize: 20, display: 'inline-block',
          opacity: loading ? 0.6 : 1
        }}>
          📷 {loading ? 'Processing...' : 'Take Photo of Register'}
        </div>
      </label>
      <input
        id="cameraInput"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </div>
  );
                                      }
