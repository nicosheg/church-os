import Tesseract from 'tesseract.js';

export async function extractNamesFromImage(imageUrl) {
  const worker = await Tesseract.createWorker('eng');
  // Set parameters to improve name recognition
  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ',
    preserve_interword_spaces: '1',
  });
  const { data: { text } } = await worker.recognize(imageUrl);
  await worker.terminate();

  // Split lines, filter out empty ones, and attempt to parse each line as a name.
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const names = lines.map(line => {
    // Simple split by spaces; assume first word is first name, rest is last name
    const parts = line.split(/\s+/);
    if (parts.length === 1) return { first_name: parts[0], last_name: '' };
    return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
  });
  return names;
    }
