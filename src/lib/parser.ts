export interface SurveyStateStats {
  count: number;
  percentage: number;
}

export interface AdaptogenStats {
  average: number;
  total: number;
}

export interface LeadRecord {
  whatsappId: string;
  status: string;
  sigPreguntaId: string;
  resumenRmkg: number | null;
  timestamp: string;
  ptsMelena: number | null;
  ptsCordy: number | null;
  ptsReishi: number | null;
  ptsAshwa: number | null;
}

export interface ParsedResult {
  leads: {
    totalRegisteredWhatsapp: number;
    surveyStates: {
      finalizada: SurveyStateStats;
      enCurso: SurveyStateStats;
      cancelada: SurveyStateStats;
      lis: SurveyStateStats;
      enCero: SurveyStateStats;
    };
    surveyLengths: {
      short: SurveyStateStats;
      long: SurveyStateStats;
    };
    averageIterations: number;
    adaptogens: {
      Pts_Melena: AdaptogenStats;
      Pts_Cordy: AdaptogenStats;
      Pts_Reishi: AdaptogenStats;
      Pts_Ashwa: AdaptogenStats;
      winner: {
        name: string;
        average: number;
        total: number;
      };
    };
    rawLeads: { whatsappId: string; status: string; }[];
    allLeads: LeadRecord[];
  };
  newFAQs: {
    totalQuestions: number;
    questions: string[];
  };
}

export function parseSheetDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [datePart, timePart] = dateStr.trim().split(' ');
  const parts = datePart.split('/');
  if (parts.length !== 3) {
    const hyphenParts = datePart.split('-');
    if (hyphenParts.length === 3) {
      if (hyphenParts[0].length === 4) {
        const year = parseInt(hyphenParts[0], 10);
        const month = parseInt(hyphenParts[1], 10) - 1;
        const day = parseInt(hyphenParts[2], 10);
        return new Date(year, month, day);
      }
      const day = parseInt(hyphenParts[0], 10);
      const month = parseInt(hyphenParts[1], 10) - 1;
      const year = parseInt(hyphenParts[2], 10);
      return new Date(year, month, day);
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (timePart) {
    const timeParts = timePart.split(':');
    if (timeParts.length >= 1) hours = parseInt(timeParts[0], 10);
    if (timeParts.length >= 2) minutes = parseInt(timeParts[1], 10);
    if (timeParts.length >= 3) seconds = parseInt(timeParts[2], 10);
  }

  const date = new Date(year, month, day, hours, minutes, seconds);
  return isNaN(date.getTime()) ? null : date;
}

export function convertToISODate(dateStr: string): string {
  const dateObj = parseSheetDate(dateStr);
  if (!dateObj) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLeads(leadsRows: string[][] | null | undefined): LeadRecord[] {
  if (!leadsRows || leadsRows.length <= 1) {
    return [];
  }

  const headers = leadsRows[0].map(h => (h || '').trim().toLowerCase());
  const rows = leadsRows.slice(1);

  const getIndex = (name: string): number => headers.indexOf(name.toLowerCase());

  const idxWhatsapp = getIndex('Whatsapp_ID');
  const idxEstado = getIndex('estado_encuesta');
  const idxSigPregunta = getIndex('sig_pregunta_id');
  const idxResumen = getIndex('resumen_rmkg');
  const idxTimestamp = getIndex('Timestamp_Ultimo');
  const idxMelena = getIndex('Pts_Melena');
  const idxCordy = getIndex('Pts_Cordy');
  const idxReishi = getIndex('Pts_Reishi');
  const idxAshwa = getIndex('Pts_Ashwa');

  const leads: LeadRecord[] = [];

  for (const row of rows) {
    const rawWhatsapp = idxWhatsapp !== -1 && row[idxWhatsapp] ? row[idxWhatsapp].trim() : '';

    const status = idxEstado !== -1 && row[idxEstado] ? row[idxEstado].trim() : '';
    const sigPreguntaId = idxSigPregunta !== -1 && row[idxSigPregunta] ? row[idxSigPregunta].trim() : '';
    
    let resumenRmkg: number | null = null;
    if (idxResumen !== -1 && row[idxResumen]) {
      const val = parseFloat(row[idxResumen].trim());
      if (!isNaN(val)) resumenRmkg = val;
    }

    const rawTimestamp = idxTimestamp !== -1 && row[idxTimestamp] ? row[idxTimestamp].trim() : '';
    const timestamp = convertToISODate(rawTimestamp);

    const parseVal = (idx: number): number | null => {
      if (idx !== -1 && row[idx]) {
        const val = parseFloat(row[idx].trim());
        return isNaN(val) ? null : val;
      }
      return null;
    };

    leads.push({
      whatsappId: rawWhatsapp,
      status,
      sigPreguntaId,
      resumenRmkg,
      timestamp,
      ptsMelena: parseVal(idxMelena),
      ptsCordy: parseVal(idxCordy),
      ptsReishi: parseVal(idxReishi),
      ptsAshwa: parseVal(idxAshwa),
    });
  }

  return leads;
}

export function parseNewFAQs(newFAQsRows: string[][] | null | undefined): { totalQuestions: number; questions: string[] } {
  if (!newFAQsRows || newFAQsRows.length <= 1) return { totalQuestions: 0, questions: [] };
  const headers = newFAQsRows[0].map(h => (h || '').trim().toLowerCase());
  const idxPregunta = headers.indexOf('pregunta');
  if (idxPregunta === -1) return { totalQuestions: 0, questions: [] };

  const questions: string[] = [];
  for (let i = 1; i < newFAQsRows.length; i++) {
    const row = newFAQsRows[i];
    if (row[idxPregunta] && row[idxPregunta].trim() !== '') {
      questions.push(row[idxPregunta].trim());
    }
  }
  return {
    totalQuestions: questions.length,
    questions,
  };
}

export function calculateStats(leads: LeadRecord[], newFAQsQuestions: string[]): ParsedResult {
  let finalizadaCount = 0;
  let enCursoCount = 0;
  let canceladaCount = 0;
  let lisCount = 0;
  let enCeroCount = 0;
  let totalStatesCount = 0;

  let shortCount = 0;
  let longCount = 0;
  let totalSigPreguntas = 0;

  let iterationsSum = 0;
  let iterationsCount = 0;

  const adaptogensData = {
    Pts_Melena: { sum: 0, count: 0 },
    Pts_Cordy: { sum: 0, count: 0 },
    Pts_Reishi: { sum: 0, count: 0 },
    Pts_Ashwa: { sum: 0, count: 0 },
  };

  for (const lead of leads) {
    const state = lead.status.toLowerCase();
    if (state.startsWith('finalizada')) {
      finalizadaCount++;
      totalStatesCount++;
    } else if (state.startsWith('en curso') || state.startsWith('en_curso')) {
      enCursoCount++;
      totalStatesCount++;
    } else if (state.startsWith('cancelada')) {
      canceladaCount++;
      totalStatesCount++;
    } else if (state.startsWith('lis')) {
      lisCount++;
      totalStatesCount++;
    } else if (state.startsWith('cero')) {
      enCeroCount++;
      totalStatesCount++;
    }

    if (lead.sigPreguntaId) {
      const sigPreg = lead.sigPreguntaId.toLowerCase();
      if (sigPreg.startsWith('c')) {
        shortCount++;
        totalSigPreguntas++;
      } else if (sigPreg.startsWith('l')) {
        longCount++;
        totalSigPreguntas++;
      }
    }

    if (lead.resumenRmkg !== null) {
      iterationsSum += lead.resumenRmkg;
      iterationsCount++;
    }

    const addAdaptogenVal = (val: number | null, key: keyof typeof adaptogensData) => {
      if (val !== null) {
        adaptogensData[key].sum += val;
        adaptogensData[key].count++;
      }
    };

    addAdaptogenVal(lead.ptsMelena, 'Pts_Melena');
    addAdaptogenVal(lead.ptsCordy, 'Pts_Cordy');
    addAdaptogenVal(lead.ptsReishi, 'Pts_Reishi');
    addAdaptogenVal(lead.ptsAshwa, 'Pts_Ashwa');
  }

  const calcStateStats = (count: number): SurveyStateStats => ({
    count,
    percentage: totalStatesCount > 0 ? (count / totalStatesCount) * 100 : 0,
  });

  const calcSigStats = (count: number): SurveyStateStats => ({
    count,
    percentage: totalSigPreguntas > 0 ? (count / totalSigPreguntas) * 100 : 0,
  });

  const avgMelena = adaptogensData.Pts_Melena.count > 0 ? adaptogensData.Pts_Melena.sum / adaptogensData.Pts_Melena.count : 0;
  const avgCordy = adaptogensData.Pts_Cordy.count > 0 ? adaptogensData.Pts_Cordy.sum / adaptogensData.Pts_Cordy.count : 0;
  const avgReishi = adaptogensData.Pts_Reishi.count > 0 ? adaptogensData.Pts_Reishi.sum / adaptogensData.Pts_Reishi.count : 0;
  const avgAshwa = adaptogensData.Pts_Ashwa.count > 0 ? adaptogensData.Pts_Ashwa.sum / adaptogensData.Pts_Ashwa.count : 0;

  const totalMelena = adaptogensData.Pts_Melena.sum;
  const totalCordy = adaptogensData.Pts_Cordy.sum;
  const totalReishi = adaptogensData.Pts_Reishi.sum;
  const totalAshwa = adaptogensData.Pts_Ashwa.sum;

  const adaptogensAvgs = [
    { name: 'Pts_Melena', average: avgMelena, total: totalMelena },
    { name: 'Pts_Cordy', average: avgCordy, total: totalCordy },
    { name: 'Pts_Reishi', average: avgReishi, total: totalReishi },
    { name: 'Pts_Ashwa', average: avgAshwa, total: totalAshwa },
  ];

  let winnerName = '';
  let winnerAvg = 0;
  let winnerTotal = 0;

  for (const item of adaptogensAvgs) {
    if (item.total > winnerTotal) {
      winnerTotal = item.total;
      winnerAvg = item.average;
      winnerName = item.name;
    }
  }

  return {
    leads: {
      totalRegisteredWhatsapp: leads.filter(l => l.whatsappId !== '').length,
      surveyStates: {
        finalizada: calcStateStats(finalizadaCount),
        enCurso: calcStateStats(enCursoCount),
        cancelada: calcStateStats(canceladaCount),
        lis: calcStateStats(lisCount),
        enCero: calcStateStats(enCeroCount),
      },
      surveyLengths: {
        short: calcSigStats(shortCount),
        long: calcSigStats(longCount),
      },
      averageIterations: iterationsCount > 0 ? iterationsSum / iterationsCount : 0,
      adaptogens: {
        Pts_Melena: { average: avgMelena, total: totalMelena },
        Pts_Cordy: { average: avgCordy, total: totalCordy },
        Pts_Reishi: { average: avgReishi, total: totalReishi },
        Pts_Ashwa: { average: avgAshwa, total: totalAshwa },
        winner: { name: winnerName, average: winnerAvg, total: winnerTotal },
      },
      rawLeads: leads.filter(l => l.whatsappId !== '').map(l => ({ whatsappId: l.whatsappId, status: l.status })),
      allLeads: leads,
    },
    newFAQs: {
      totalQuestions: newFAQsQuestions.length,
      questions: newFAQsQuestions,
    },
  };
}

export function parseSheetsData(leadsRows: string[][] | null | undefined, newFAQsRows: string[][] | null | undefined): ParsedResult {
  const leads = parseLeads(leadsRows);
  const faqs = parseNewFAQs(newFAQsRows);
  return calculateStats(leads, faqs.questions);
}
