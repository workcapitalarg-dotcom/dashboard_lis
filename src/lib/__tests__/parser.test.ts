import { describe, it, expect } from 'vitest';
import { parseSheetsData, parseLeads, calculateStats } from '../parser';

describe('parseSheetsData', () => {
  const mockLeadsData = [
    [
      'Whatsapp_ID',
      'nombre',
      'estado_encuesta',
      'sig_pregunta_id',
      'resumen_rmkg',
      'Timestamp_Ultimo',
      'Pts_Melena',
      'Pts_Cordy',
      'Pts_Reishi',
      'Pts_Ashwa',
      'enrutador_e2',
      'enrutador_fin',
      'Perfil_Comprador',
    ],
    ['12345', 'Alice', 'finalizada', 'l_pregunta1', '5', '2026-05-20', '10', '8', '6', '4', 'e2_a', 'fin_a', 'comprador_a'],
    ['67890', 'Bob', 'en curso', 'c_pregunta2', '2', '2026-05-20', '5', '5', '5', '5', 'e2_b', 'fin_b', 'comprador_b'],
    ['', 'Charlie', 'cancelada', 'c_pregunta3', '3', '2026-05-20', '2', '4', '8', '10', 'e2_c', 'fin_c', 'comprador_c'],
    ['11111', 'David', 'finalizada', 'l_pregunta4', 'abc', '2026-05-20', '0', '0', '0', '0', 'e2_d', 'fin_d', 'comprador_d'],
    ['22222', 'Eva', 'finalizada', '', '6', '2026-05-20', '8', '9', '7', '8', 'e2_e', 'fin_e', 'comprador_e'],
    ['33333', 'Frank', 'finalizada', 'c_preg', '4', '2026-05-20', 'something', '8', '6', '4', 'e2_f', 'fin_f', 'comprador_f'],
    ['44444', 'Grace', 'Lis', 'c_pregunta5', '1', '2026-05-20', '2', '2', '2', '2', 'e2_g', 'fin_g', 'comprador_g'],
    ['55555', 'Hugo', 'cero', 'c_pregunta6', '2', '2026-05-20', '1', '2', '3', '4', 'e2_h', 'fin_h', 'comprador_h'],
  ];

  const mockNewFAQsData = [
    ['Whatsapp_Id', 'pregunta'],
    ['12345', 'How do I grow mushrooms?'],
    ['67890', 'What is Reishi?'],
    ['11111', ''],
    ['', 'Is Cordyceps safe?'],
  ];

  it('should parse leads and calculate correct statistics', () => {
    const result = parseSheetsData(mockLeadsData, mockNewFAQsData);

    // 1. WhatsApp ID counts
    expect(result.leads.totalRegisteredWhatsapp).toBe(7);

    // 2. Survey states count and percentages
    expect(result.leads.surveyStates.finalizada.count).toBe(4);
    expect(result.leads.surveyStates.finalizada.percentage).toBeCloseTo(50.00, 2);

    expect(result.leads.surveyStates.enCurso.count).toBe(1);
    expect(result.leads.surveyStates.enCurso.percentage).toBeCloseTo(12.50, 2);

    expect(result.leads.surveyStates.cancelada.count).toBe(1);
    expect(result.leads.surveyStates.cancelada.percentage).toBeCloseTo(12.50, 2);

    expect(result.leads.surveyStates.lis.count).toBe(1);
    expect(result.leads.surveyStates.lis.percentage).toBeCloseTo(12.50, 2);

    expect(result.leads.surveyStates.enCero.count).toBe(1);
    expect(result.leads.surveyStates.enCero.percentage).toBeCloseTo(12.50, 2);

    // 3. sig_pregunta_id stats (short 'c' vs long 'l')
    expect(result.leads.surveyLengths.short.count).toBe(5);
    expect(result.leads.surveyLengths.short.percentage).toBeCloseTo(71.43, 2);
    expect(result.leads.surveyLengths.long.count).toBe(2);
    expect(result.leads.surveyLengths.long.percentage).toBeCloseTo(28.57, 2);

    // 4. resumen_rmkg average iterations
    expect(result.leads.averageIterations).toBeCloseTo(3.29, 2);

    // 5. Adaptogens totals, averages and winner
    expect(result.leads.adaptogens.Pts_Melena.total).toBe(28);
    expect(result.leads.adaptogens.Pts_Cordy.total).toBe(38);
    expect(result.leads.adaptogens.Pts_Reishi.total).toBe(37);
    expect(result.leads.adaptogens.Pts_Ashwa.total).toBe(37);
    expect(result.leads.adaptogens.Pts_Melena.average).toBeCloseTo(4.0, 1);
    expect(result.leads.adaptogens.Pts_Cordy.average).toBeCloseTo(4.75, 2);
    expect(result.leads.adaptogens.Pts_Reishi.average).toBeCloseTo(4.63, 2);
    expect(result.leads.adaptogens.Pts_Ashwa.average).toBeCloseTo(4.63, 2);
    expect(result.leads.adaptogens.winner.name).toBe('Pts_Cordy');
    expect(result.leads.adaptogens.winner.total).toBe(38);
    expect(result.leads.adaptogens.winner.average).toBeCloseTo(4.75, 2);

    // 6. newFAQs count
    expect(result.newFAQs.totalQuestions).toBe(3);
    expect(result.newFAQs.questions).toEqual([
      'How do I grow mushrooms?',
      'What is Reishi?',
      'Is Cordyceps safe?',
    ]);

    // 7. rawLeads list
    expect(result.leads.rawLeads).toBeDefined();
    expect(result.leads.rawLeads.length).toBe(7);
    expect(result.leads.rawLeads[0]).toEqual({ whatsappId: '12345', status: 'finalizada' });

    // 8. allLeads list
    expect(result.leads.allLeads).toBeDefined();
    expect(result.leads.allLeads.length).toBe(8); // includes Charlie
    expect(result.leads.allLeads[0].timestamp).toBe('2026-05-20');
  });

  it('should calculate stats correctly on a subset of leads using calculateStats', () => {
    const leads = parseLeads(mockLeadsData);
    
    // Filter leads for a specific condition (e.g. only finalizada status)
    const finalizadaLeads = leads.filter((l: LeadRecord) => l.status === 'finalizada');
    const result = calculateStats(finalizadaLeads, ['How do I grow mushrooms?']);

    expect(result.leads.totalRegisteredWhatsapp).toBe(4);
    expect(result.leads.surveyStates.finalizada.count).toBe(4);
    expect(result.leads.surveyStates.finalizada.percentage).toBe(100);
    expect(result.newFAQs.totalQuestions).toBe(1);
  });

  it('should handle empty or malformed input gracefully', () => {
    const result = parseSheetsData([], []);
    expect(result.leads.totalRegisteredWhatsapp).toBe(0);
    expect(result.leads.averageIterations).toBe(0);
    expect(result.leads.adaptogens.winner.name).toBe('');
    expect(result.leads.adaptogens.winner.average).toBe(0);
    expect(result.leads.adaptogens.winner.total).toBe(0);
    expect(result.leads.adaptogens.Pts_Melena.total).toBe(0);
    expect(result.leads.rawLeads).toEqual([]);
    expect(result.newFAQs.totalQuestions).toBe(0);
    expect(result.newFAQs.questions).toEqual([]);
  });
});
