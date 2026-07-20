import Tesseract from 'tesseract.js';

export default async function handler(req, res) {
  try {
    // Only create and terminate the worker – no image recognition
    const worker = await Tesseract.createWorker('eng');
    await worker.terminate();
    res.status(200).json({ message: 'Tesseract is ready and working' });
  } catch (err) {
    res.status(500).json({ error: err.message || err.toString() });
  }
}
