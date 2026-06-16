const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
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

let cleanKey = privateKey.trim();
if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
  cleanKey = cleanKey.slice(1, -1);
}
if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
  cleanKey = cleanKey.slice(1, -1);
}
const formattedPrivateKey = cleanKey.replace(/\\n/g, '\n');

const auth = new google.auth.JWT({
  email,
  key: formattedPrivateKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

sheets.spreadsheets.get({
  spreadsheetId: '14Syfpkb_GLBVJYrpQGv5yntaFHySbI7RJq6G-ilxZ-Q',
}).then(res => {
  console.log('Sheets:');
  res.data.sheets.forEach(s => {
    console.log(`- Title: "${s.properties.title}", ID: ${s.properties.sheetId}`);
  });
}).catch(err => {
  console.error('Error:', err);
});
