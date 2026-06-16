import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { parseSheetsData } from '@/lib/parser';
import * as fs from 'fs';
import * as path from 'path';

// Force dynamic execution for this API route
export const dynamic = 'force-dynamic';

const SPREADSHEET_ID = '14Syfpkb_GLBVJYrpQGv5yntaFHySbI7RJq6G-ilxZ-Q';

/**
 * Read and parse .env.local manually using fs, bypassing Next.js env loading
 * which may corrupt private key newlines or special characters.
 */
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
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      // Convert escaped newlines to real newlines
      val = val.replace(/\\n/g, '\n');
      result[key] = val;
    }
  });

  return result;
}

export async function GET() {
  const env = loadEnvLocal();
  const email = env['GOOGLE_SERVICE_ACCOUNT_EMAIL'];
  const privateKey = env['GOOGLE_PRIVATE_KEY'];

  if (!email || !privateKey) {
    return NextResponse.json({
      error: 'Google Service Account credentials not found in .env.local. Please configure GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.'
    }, { status: 500 });
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch leads and newFAQs tabs in parallel
    const [leadsResponse, newFAQsResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'leads!A:M',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'newFAQs!A:B',
      })
    ]);

    const leadsRows = leadsResponse.data.values || [];
    const newFAQsRows = newFAQsResponse.data.values || [];

    if (leadsRows.length === 0) {
      return NextResponse.json({
        error: 'No se encontraron datos en la pestaña "leads" de la hoja de cálculo.'
      }, { status: 500 });
    }

    const parsed = parseSheetsData(leadsRows, newFAQsRows);

    return NextResponse.json({
      data: parsed
    });
  } catch (error: any) {
    console.error('Error fetching data from Google Sheets:', error);
    return NextResponse.json({
      error: error.message || 'Error al conectar con la API de Google Sheets. Verifica tus credenciales y los permisos de acceso del archivo.'
    }, { status: 500 });
  }
}
