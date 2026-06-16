import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleCredentials } from '../../../../lib/env';

export const dynamic = 'force-dynamic';

const SPREADSHEET_ID = '14Syfpkb_GLBVJYrpQGv5yntaFHySbI7RJq6G-ilxZ-Q';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos: question' }, { status: 400 });
    }

    const { email, privateKey } = getGoogleCredentials();

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

    // Fetch column A & B of newFAQs sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'newFAQs!A:B',
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron filas en newFAQs' }, { status: 404 });
    }

    // Find the 'pregunta' column header index
    const headers = rows[0].map(h => (h || '').trim().toLowerCase());
    const idxPregunta = headers.indexOf('pregunta');

    if (idxPregunta === -1) {
      return NextResponse.json({ error: 'La columna "pregunta" no existe en la hoja newFAQs.' }, { status: 400 });
    }

    // Find the row index (1-based for Sheets API, but for deleteDimension we will need 0-based start/end indices)
    let matchedRowIndex = -1; // 1-based row number
    for (let i = 1; i < rows.length; i++) {
      const rowQuestion = (rows[i][idxPregunta] || '').trim();
      if (rowQuestion === question.trim()) {
        matchedRowIndex = i + 1; // 1-based index
        break;
      }
    }

    if (matchedRowIndex === -1) {
      return NextResponse.json({ error: 'No se encontró la pregunta especificada en la hoja.' }, { status: 404 });
    }

    // To delete the row, we need the numerical sheetId of the "newFAQs" tab
    const spreadsheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const newFaqsSheet = spreadsheetMetadata.data.sheets?.find(
      s => s.properties?.title?.toLowerCase() === 'newfaqs'
    );

    const sheetId = newFaqsSheet?.properties?.sheetId;
    if (sheetId === undefined || sheetId === null) {
      return NextResponse.json({ error: 'No se pudo obtener el ID de la hoja "newFAQs".' }, { status: 500 });
    }

    // Delete the row using deleteDimension batchUpdate (0-based start/end index)
    const startIndex = matchedRowIndex - 1; // e.g., if matchedRowIndex is 3 (row 3), startIndex is 2
    const endIndex = matchedRowIndex;       // exclusive, so 3

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex,
                endIndex,
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: `FAQ "${question}" eliminada exitosamente.`
    });

  } catch (error: any) {
    console.error('Error deleting FAQ from Google Sheets:', error);
    return NextResponse.json({
      error: error.message || 'Error interno al eliminar la FAQ.'
    }, { status: 500 });
  }
}
