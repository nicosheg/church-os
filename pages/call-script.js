import { useState, useEffect } from 'react';
import Link from 'next/link';

const DEFAULT_TEMPLATE = {
  greeting: "Hello {first_name}, this is Grace from your church.",
  body: "We missed you today. Are you doing okay?",
  prayer: "Would you like us to pray with you?",
  closing: "Thank you. We look forward to seeing you soon. God bless.",
};

export default function CallScriptEditor() {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [mode, setMode] = useState('simple'); // simple or advanced
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('callScript');
    if (stored) setTemplate(JSON.parse(stored));
  }, []);

  const saveTemplate = () => {
    localStorage.setItem('callScript', JSON.stringify(template));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateField = (field, value) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <nav style={navStyle}>
        <Link href="/">📊 Dashboard</Link>
        <Link href="/call-script" style={{ fontWeight: 'bold' }}>📞 Call Script</Link>
      </nav>

      <h1>📞 Call Script Editor</h1>
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setMode('simple')} style={modeBtnStyle(mode === 'simple')}>Simple</button>
        <button onClick={() => setMode('advanced')} style={modeBtnStyle(mode === 'advanced')}>Advanced</button>
      </div>

      {mode === 'simple' ? (
        <>
          <div style={fieldStyle}>
            <label>Greeting</label>
            <input value={template.greeting} onChange={e => updateField('greeting', e.target.value)} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label>Main Message</label>
            <input value={template.body} onChange={e => updateField('body', e.target.value)} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label>Prayer Offer</label>
            <input value={template.prayer} onChange={e => updateField('prayer', e.target.value)} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label>Closing</label>
            <input value={template.closing} onChange={e => updateField('closing', e.target.value)} style={inputStyle} />
          </div>
        </>
      ) : (
        <textarea
          value={JSON.stringify(template, null, 2)}
          onChange={e => { try { setTemplate(JSON.parse(e.target.value)); } catch {} }}
          style={{ width: '100%', height: 300, padding: 10, fontFamily: 'monospace' }}
        />
      )}

      <button onClick={saveTemplate} style={buttonStyle}>
        {saved ? '✅ Saved' : '💾 Save Template'}
      </button>
    </div>
  );
}

const navStyle = { display: 'flex', gap: 20, marginBottom: 30, borderBottom: '1px solid #eee', paddingBottom: 15 };
const modeBtnStyle = (active) => ({
  padding: '8px 16px', marginRight: 10, borderRadius: 6,
  background: active ? '#4F46E5' : '#eee', color: active ? '#fff' : '#333', border: 'none', cursor: 'pointer',
});
const fieldStyle = { marginBottom: 15 };
const inputStyle = { width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc' };
const buttonStyle = { background: '#4F46E5', color: 'white', padding: '12px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', marginTop: 20 };
