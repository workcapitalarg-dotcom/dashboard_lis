import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

const SPREADSHEET_ID = '14Syfpkb_GLBVJYrpQGv5yntaFHySbI7RJq6G-ilxZ-Q';

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};

  const content = fs.readFileSync(envPath, 'utf8');
  const result: Record<string, string> = {};

  content.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      val = val.replace(/\\n/g, '\n');
      result[key] = val;
    }
  });

  return result;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { whatsappId, newStatus } = body;

    if (!whatsappId || !newStatus) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos: whatsappId, newStatus' }, { status: 400 });
    }

    const env = loadEnvLocal();
    const email = env['GOOGLE_SERVICE_ACCOUNT_EMAIL'];
    const privateKey = env['GOOGLE_PRIVATE_KEY'];

    if (!email || !privateKey) {
      return NextResponse.json({
        error: 'Credenciales de Google Service Account no configuradas.'
      }, { status: 500 });
    }

    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch column A & C (WhatsApp ID and Estado) to find the row and check status
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'leads!A:C',
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron filas en leads' }, { status: 404 });
    }

    // Find row index (1-based for sheets)
    let matchedRowIndex = -1;
    let currentStatus = '';

    for (let i = 0; i < rows.length; i++) {
      const rowWhatsapp = (rows[i][0] || '').trim();
      if (rowWhatsapp === whatsappId.trim()) {
        matchedRowIndex = i + 1; // Sheets is 1-indexed
        currentStatus = (rows[i][2] || '').trim();
        break;
      }
    }

    if (matchedRowIndex === -1) {
      return NextResponse.json({ error: `No se encontró el Whatsapp_ID: ${whatsappId}` }, { status: 404 });
    }

    // Business rule: If newStatus is "CERO", it can ONLY transition if currentStatus is "Lis" (case-insensitive)
    if (newStatus.toUpperCase() === 'CERO') {
      if (currentStatus.toUpperCase() !== 'LIS') {
        return NextResponse.json({ 
          error: `No se puede cambiar a CERO. El estado actual debe ser "Lis", pero es "${currentStatus}".` 
        }, { status: 400 });
      }
    }

    // Update column C (which is index 2 -> "C")
    const updateRange = `leads!C${matchedRowIndex}`;
    
    // We write 'CERO' or the passed status
    const statusToWrite = newStatus.toUpperCase() === 'CERO' ? 'CERO' : newStatus;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[statusToWrite]],
      },
    });

    return NextResponse.json({ 
      success: true, 
      updatedStatus: statusToWrite, 
      message: `Estado de ${whatsappId} cambiado exitosamente a ${statusToWrite}` 
    });

  } catch (error: any) {
    console.error('Error updating status in Google Sheets:', error);
    return NextResponse.json({
      error: error.message || 'Error interno al actualizar el estado.'
    }, { status: 500 });
  }
}
