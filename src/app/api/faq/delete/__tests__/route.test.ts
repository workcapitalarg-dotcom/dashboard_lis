import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// Mock fs to bypass loading .env.local file
vi.mock('fs', () => ({
  existsSync: () => true,
  readFileSync: () => 'GOOGLE_SERVICE_ACCOUNT_EMAIL=test@example.com\nGOOGLE_PRIVATE_KEY=mock_private_key',
}));

// Mock googleapis
const mockGetValues = vi.fn();
const mockBatchUpdate = vi.fn();
const mockGetSpreadsheet = vi.fn();

vi.mock('googleapis', () => {
  return {
    google: {
      auth: {
        JWT: vi.fn().mockImplementation(function() {
          return {};
        }),
      },
      sheets: vi.fn().mockImplementation(() => {
        return {
          spreadsheets: {
            values: {
              get: mockGetValues,
            },
            get: mockGetSpreadsheet,
            batchUpdate: mockBatchUpdate,
          },
        };
      }),
    },
  };
});

describe('POST /api/faq/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if question is missing', async () => {
    const request = new Request('http://localhost/api/faq/delete', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Faltan parámetros requeridos: question');
  });

  it('should return 404 if newFAQs tab has no rows', async () => {
    mockGetValues.mockResolvedValueOnce({
      data: {
        values: [],
      },
    });

    const request = new Request('http://localhost/api/faq/delete', {
      method: 'POST',
      body: JSON.stringify({ question: 'Some FAQ' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe('No se encontraron filas en newFAQs');
  });

  it('should return 404 if the question is not found in newFAQs tab', async () => {
    mockGetValues.mockResolvedValueOnce({
      data: {
        values: [
          ['whatsapp_id', 'pregunta'],
          ['123', 'FAQ 1'],
          ['456', 'FAQ 2'],
        ],
      },
    });

    const request = new Request('http://localhost/api/faq/delete', {
      method: 'POST',
      body: JSON.stringify({ question: 'Non-existent FAQ' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe('No se encontró la pregunta especificada en la hoja.');
  });

  it('should delete the row successfully when the question matches', async () => {
    // 1. Mock reading newFAQs rows (we want to delete the row with 'FAQ 2', which is index 2, row index 3 in sheet)
    mockGetValues.mockResolvedValueOnce({
      data: {
        values: [
          ['whatsapp_id', 'pregunta'],
          ['123', 'FAQ 1'],
          ['456', 'FAQ 2'],
        ],
      },
    });

    // 2. Mock getting spreadsheet metadata to get the sheetId of 'newFAQs'
    mockGetSpreadsheet.mockResolvedValueOnce({
      data: {
        sheets: [
          {
            properties: {
              title: 'newFAQs',
              sheetId: 987654,
            },
          },
        ],
      },
    });

    // 3. Mock batchUpdate response
    mockBatchUpdate.mockResolvedValueOnce({
      data: {},
    });

    const request = new Request('http://localhost/api/faq/delete', {
      method: 'POST',
      body: JSON.stringify({ question: 'FAQ 2' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('FAQ 2');

    // Verify batchUpdate payload
    expect(mockBatchUpdate).toHaveBeenCalledWith({
      spreadsheetId: expect.any(String),
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 987654,
                dimension: 'ROWS',
                startIndex: 2, // 0-based: row 3 is index 2
                endIndex: 3, // exclusive
              },
            },
          },
        ],
      },
    });
  });
});
