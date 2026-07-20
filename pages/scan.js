import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { getScanState, setScanState, clearScanState } from '../lib/scanStore';
import Tesseract from 'tesseract.js';

export default function ScanPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [scanState, setScanStateLocal] = useState(getScanState());
  const [programName, setProgramName] = useState('GIBEON');

  useEffect(() => {
    const state = getScanState();
    setScanStateLocal(state);
  }, []);

  const updateState = (newState) => {
    setScanState(newState);
    setScanStateLocal(prev => ({ ...prev, ...newState }));
  };

  // Perform OCR directly in the browser
  const extractNamesFromFile = async (file) => {
    const worker = await Tesseract.createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+ ',
      preserve_interword_spaces: '1',
    });
    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();

    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    return lines.map(line => {
      const parts = line.split(/\s+/);
      if (parts.length === 1) return { first_name: parts[0], last_name: '' };
      return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
    });
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    updateState({ status: 'processing', message: 'Reading names...' });

    try {
      // 1. OCR in the browser
      const extractedNames = await extractNamesFromFile(file);
      if (extractedNames.length === 0) {
        updateState({ status: 'error', message: '❌ No names detected. Please try again with a clearer photo.' });
        return;
      }

      updateState({ message: `Found ${extractedNames.length} names. Saving...` });

      // 2. Send extracted names to backend
      const res = await fetch('/api/attendance/process-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          church_id: 'demo-church',
          program_name: programName.trim() || 'GIBEON',
          names: extractedNames,
        }),
      });

      const data = await res.json();

      if (data.status === 'ok') {
        updateState({
          status: 'success',
          message: `✅ Scan complete! ${data.present_count} present (${data.new_members} new members added).`,
        });
        setTimeout(() => {
          clearScanState();
          router.push('/');
        }, 3000);
      } else {
        updateState({ status: 'error', message: '❌ Error: ' + (data.error || 'Unknown') });
      }
    } catch (err) {
      updateState({ status: 'error', message: '❌ Error: ' + err.message });
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Layout>
      <div style={{ maxWidth: 500, margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Scan Attendance</h1>
        <p style={{ color: '#555', marginBottom: 25 }}>{today}</p>

        {scanState.status === 'idle' && (
          <>
            <div style={{ marginBottom: 25 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Program / Event Name
              </label>
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
              <div
                style={{
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  color: 'white',
                  padding: '18px 40px',
                  borderRadius: 16,
                  fontSize: 20,
                  fontWeight: 600,
                  boxShadow: '0 8px 24px rgba(79,70,229,0.3)',
                  transition: 'transform 0.2s',
                }}
              >
                📷 Take Photo of Register
              </div>
            </label>
            <input
              ref={fileInputRef}
              id="cameraInput"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
          </>
        )}

        {scanState.status !== 'idle' && (
          <div
            style={{
              marginTop: 30,
              padding: 12,
              background: 'rgba(255,255,255,0.8)',
              borderRadius: 12,
              backdropFilter: 'blur(5px)',
            }}
          >
            {scanState.status === 'processing' && (
              <p style={{ fontSize: 18 }}>⏳ {scanState.message}</p>
            )}
            {(scanState.status === 'success' || scanState.status === 'error') && (
              <p style={{ fontSize: 18 }}>{scanState.message}</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
    }
