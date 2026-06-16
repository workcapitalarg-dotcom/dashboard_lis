import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let email = '';
let privateKey = '';

envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (key === 'GOOGLE_SERVICE_ACCOUNT_EMAIL') {
      email = val.replace(/^["']|["']$/g, '');
    }
    if (key === 'GOOGLE_PRIVATE_KEY') {
      privateKey = val;
    }
  }
});

console.log('--- API REQUEST TEST WITH CORRECT KEY ---');

let cleanKey = privateKey.trim();
if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
  cleanKey = cleanKey.slice(1, -1);
}
if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
  cleanKey = cleanKey.slice(1, -1);
}
const formattedPrivateKey = cleanKey.replace(/\\n/g, '\n');

try {
  const auth = new google.auth.JWT({
    email,
    key: formattedPrivateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  
  console.log('Requesting leads data...');
  
  sheets.spreadsheets.values.get({
    spreadsheetId: '14Syfpkb_GLBVJYrpQGv5yntaFHySbI7RJq6G-ilxZ-Q',
    range: 'leads!A1:D5',
  }).then(res => {
    console.log('SUCCESS! Google Sheets responded:');
    console.log(JSON.stringify(res.data.values, null, 2));
  }).catch(err => {
    console.error('API Request Error:', err);
  });

} catch (err: any) {
  console.error('Sync error constructing JWT:', err);
}
