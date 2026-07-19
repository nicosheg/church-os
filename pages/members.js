import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const churchId = 'demo-church';

  useEffect(() => {
    fetch(`/api/members?church_id=${churchId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMembers(data);
        else { setMembers([]); setMessage('Invalid data.'); }
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  const addMember = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, church_id: churchId, type: 'member' }),
    });
    const data = await res.json();
    if (data && data.id) {
      setMembers([data, ...members]);
      setForm({ first_name: '', last_name: '', phone: '' });
      setMessage(`✅ ${data.first_name} added`);
    } else {
      setMessage('Error: ' + (data.error || 'Could not add'));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const uploadBulk = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').filter(Boolean);
      for (const line of lines) {
        const [first, last, phone] = line.split(',').map(s => s.trim());
        if (first && phone) {
          await fetch('/api/members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_name: first, last_name: last || '', phone, church_id: churchId, type: 'member' }),
          });
        }
      }
      const res = await fetch(`/api/members?church_id=${churchId}`);
      const updated = await res.json();
      if (Array.isArray(updated)) setMembers(updated);
      setMessage('✅ Bulk upload complete');
    };
    reader.readAsText(file);
  };

  if (loading) return <p>Loading...</p>;

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>👥 Member Management</h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 30, marginTop: 20 }}>
          {/* Add Member Form */}
          <form onSubmit={addMember} style={{ flex: 1, minWidth: 280, backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.7)', padding: 20, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
            <h3 style={{ marginBottom: 15 }}>Add Member</h3>
            <input placeholder="First Name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required style={inputField} />
            <input placeholder="Last Name" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} style={inputField} />
            <input placeholder="Phone (080...)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required style={inputField} />
            <p style={{ fontSize: 12, color: '#888', margin: '4px 0 10px' }}>+234 added automatically</p>
            <button type="submit" style={btnPrimary}>➕ Add Member</button>
          </form>

          {/* Bulk Upload */}
          <div style={{ flex: 1, minWidth: 280, backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.7)', padding: 20, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
            <h3 style={{ marginBottom: 15 }}>Bulk Upload</h3>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 12 }}>CSV: FirstName,LastName,Phone (one per line)</p>
            <input type="file" accept=".csv,.txt" onChange={uploadBulk} style={{ fontSize: 14 }} />
          </div>
        </div>

        {message && <div style={{ marginTop: 20, padding: 12, background: '#e8f5e9', borderRadius: 12 }}>{message}</div>}

        {/* Members Table */}
        <div style={{ marginTop: 30, backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.7)', borderRadius: 16, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
          <h3>All Members ({members.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                <th style={th}>Name</th>
                <th style={th}>Phone</th>
                <th style={th}>Type</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={td}>{m.first_name} {m.last_name}</td>
                  <td style={td}>{m.phone}</td>
                  <td style={td}>{m.type || 'member'}</td>
                  <td style={td}>{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

const inputField = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  marginBottom: 12,
  borderRadius: 8,
  border: '1px solid #ddd',
  background: 'rgba(255,255,255,0.9)',
  outline: 'none',
};

const btnPrimary = {
  background: '#4F46E5',
  color: '#fff',
  padding: '10px 20px',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.2s',
};

const th = { padding: '12px 8px', textAlign: 'left', fontWeight: 600, color: '#555' };
const td = { padding: '10px 8px' };
