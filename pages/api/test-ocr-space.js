export default async function handler(req, res) {
  try {
    // Valid 1x1 pixel white JPEG (base64) – always accepted by OCR.space
    const validImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Image: `data:image/png;base64,${validImageBase64}`,
        apikey: 'helloworld',
        language: 'eng',
        isOverlayRequired: false,
      }),
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
