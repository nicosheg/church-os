import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID; // ID from sheet URL

export async function appendToSheet(memberId, intent, callTime) {
  try {
    const { supabaseAdmin } = require('../lib/supabaseClient');
    const { data: member } = await supabaseAdmin.from('members').select('first_name,last_name,phone').eq('id', memberId).single();
    const date = new Date(callTime).toLocaleDateString();
    const time = new Date(callTime).toLocaleTimeString();

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:F',  // columns: Date, Time, Name, Phone, Intent, Status
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[date, time, `${member.first_name} ${member.last_name}`, member.phone, intent, 'completed']],
      },
    });
  } catch (e) {
    console.error('Sheets append error:', e);
  }
}
