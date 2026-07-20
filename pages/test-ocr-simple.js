import { useState } from 'react';
import Tesseract from 'tesseract.js';

export default function SimpleOCRTest() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('processing');
    setText('');

    try {
      const worker = await Tesseract.createWorker('eng');
      // Use the File object directly – Tesseract.js can handle it
      const { data: { text: recognizedText } } = await worker.recognize(file);
      await worker.terminate();

      setText(recognizedText || '(no text found)');
      setStatus('success');
    } catch (err) {
      setText('Error: ' + (err.message || err));
      setStatus('error');
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <h1>Minimal OCR Test</h1>
      <p>Select an image with handwritten names to test Tesseract.js directly.</p>

      <input type="file" accept="image/*" capture="environment" onChange={handleFile} />

      {status === 'processing' && <p>⏳ Running OCR...</p>}

      {text && (
        <div style={{ marginTop: 20, whiteSpace: 'pre-wrap', background: '#f0f0f0', padding: 12, borderRadius: 8 }}>
          <h3>Extracted Text:</h3>
          <pre>{text}</pre>
        </div>
      )}
    </div>
  );
}
