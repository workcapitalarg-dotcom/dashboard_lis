'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ParsedResult, calculateStats, LeadRecord } from '@/lib/parser';

interface ApiResponse {
  error?: string;
  data: ParsedResult;
}

export default function Dashboard() {
  const [stats, setStats] = useState<ParsedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activePreset, setActivePreset] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<{ whatsappId: string; status: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<{ success?: boolean; message?: string } | null>(null);
  const [deletingFaq, setDeletingFaq] = useState<string | null>(null);
  const [faqFeedback, setFaqFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleDeleteFaq = async (question: string) => {
    setDeletingFaq(question);
    setFaqFeedback(null);
    try {
      const res = await fetch('/api/faq/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al eliminar la FAQ.');
      }
      setFaqFeedback({ success: true, message: json.message });
      await fetchStats(true);
    } catch (err: any) {
      setFaqFeedback({ success: false, message: err.message });
    } finally {
      setDeletingFaq(null);
    }
  };

  // Sync selectedLead when stats change
  useEffect(() => {
    if (stats) {
      if (selectedLead) {
        const fresh = stats.leads.rawLeads.find(l => l.whatsappId === selectedLead.whatsappId);
        if (fresh && fresh.status !== selectedLead.status) {
          setSelectedLead(fresh);
        }
      }
      if (deletingFaq) {
        if (!stats.newFAQs.questions.includes(deletingFaq)) {
          setDeletingFaq(null);
        }
      }
    }
  }, [stats]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedLead) return;
    setIsUpdating(true);
    setUpdateFeedback(null);
    try {
      const res = await fetch('/api/lead/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappId: selectedLead.whatsappId,
          newStatus
        })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al actualizar el estado.');
      }
      setUpdateFeedback({ success: true, message: json.message });
      setSelectedLead({ ...selectedLead, status: json.updatedStatus });
      fetchStats(true);
    } catch (err: any) {
      setUpdateFeedback({ success: false, message: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchStats = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      const response = await fetch('/api/stats');
      const json: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(json.error || `HTTP error! status: ${response.status}`);
      }

      setStats(json.data);
      if (json.data && json.data.leads && json.data.leads.allLeads && json.data.leads.allLeads.length > 0) {
        const dates = json.data.leads.allLeads
          .map((l: LeadRecord) => l.timestamp)
          .filter((t: string) => t && t.trim() !== '')
          .sort();
        
        if (dates.length > 0) {
          const minDate = dates[0].split(' ')[0].split('T')[0];
          const maxDate = dates[dates.length - 1].split(' ')[0].split('T')[0];
          
          setStartDate(minDate);
          setEndDate(maxDate);
          setActivePreset('all');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Helper to check if date falls within the selected range
  const isDateInRange = (timestampStr: string, startStr: string, endStr: string) => {
    if (!timestampStr) return false;
    const datePart = timestampStr.trim().split(' ')[0].split('T')[0];
    
    if (startStr && datePart < startStr) return false;
    if (endStr && datePart > endStr) return false;
    return true;
  };

  // Handle Preset Changes
  const handlePresetChange = (presetId: string) => {
    setActivePreset(presetId);
    if (!stats || !stats.leads || !stats.leads.allLeads || stats.leads.allLeads.length === 0) return;

    const dates = stats.leads.allLeads
      .map(l => l.timestamp)
      .filter(t => t && t.trim() !== '')
      .sort();
    
    if (dates.length === 0) return;
    const minDate = dates[0].split(' ')[0].split('T')[0];
    const maxDate = dates[dates.length - 1].split(' ')[0].split('T')[0];

    const today = new Date();
    
    if (presetId === 'all') {
      setStartDate(minDate);
      setEndDate(maxDate);
    } else if (presetId === 'today') {
      const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (presetId === '7d') {
      const start = new Date();
      start.setDate(today.getDate() - 7);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(maxDate);
    } else if (presetId === '30d') {
      const start = new Date();
      start.setDate(today.getDate() - 30);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(maxDate);
    } else if (presetId === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(maxDate);
    }
  };

  // Helper to calculate the previous equivalent date range
  const getPreviousDateRange = (startDateStr: string, endDateStr: string) => {
    if (!startDateStr || !endDateStr) return null;
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');
    const diffTime = end.getTime() - start.getTime(); // in ms
    
    // Previous period ends 1 day before current start date
    const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const prevStart = new Date(prevEnd.getTime() - diffTime);
    
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      startDate: formatDate(prevStart),
      endDate: formatDate(prevEnd)
    };
  };

  // Memoized filtered stats
  const filteredStats = useMemo(() => {
    if (!stats) return null;

    const filteredLeads = stats.leads.allLeads.filter(lead => 
      isDateInRange(lead.timestamp, startDate, endDate)
    );

    return calculateStats(filteredLeads, stats.newFAQs.questions);
  }, [stats, startDate, endDate]);

  // Memoized previous period stats
  const prevStats = useMemo(() => {
    if (!stats || !startDate || !endDate) return null;
    
    const prevRange = getPreviousDateRange(startDate, endDate);
    if (!prevRange) return null;

    const prevLeads = stats.leads.allLeads.filter(lead => 
      isDateInRange(lead.timestamp, prevRange.startDate, prevRange.endDate)
    );

    return calculateStats(prevLeads, stats.newFAQs.questions);
  }, [stats, startDate, endDate]);

  // Helper to render comparison metric variation badge
  const renderComparison = (current: number, previous: number, isHigherBetter = true) => {
    const diff = current - previous;
    const pctChange = previous > 0 ? (diff / previous) * 100 : 0;
    
    let badgeClass = 'comparison-badge comparison-neutral';
    let sign = '';
    
    if (diff > 0) {
      badgeClass = isHigherBetter ? 'comparison-badge comparison-positive' : 'comparison-badge comparison-negative';
      sign = '+';
    } else if (diff < 0) {
      badgeClass = isHigherBetter ? 'comparison-badge comparison-negative' : 'comparison-badge comparison-positive';
    }
    
    return (
      <div className="comparison-wrapper">
        <span className={badgeClass}>
          {sign}{pctChange.toFixed(1)}%
        </span>
        <span className="comparison-label">
          vs anterior: {previous.toFixed(previous % 1 === 0 ? 0 : 2)}
        </span>
      </div>
    );
  };

  const handleRefresh = () => {
    fetchStats(true);
  };

  // Helper to format adaptogen display names
  const getAdaptogenDisplayName = (name: string): string => {
    const mapping: Record<string, string> = {
      Pts_Melena: 'Melena de León',
      Pts_Cordy: 'Cordyceps',
      Pts_Reishi: 'Reishi',
      Pts_Ashwa: 'Ashwagandha',
    };
    return mapping[name] || name;
  };

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '1.5rem' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#10b981', borderRadius: '50%' }}></div>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-family-display)', fontWeight: 500 }}>Cargando estadísticas en tiempo real...</p>
      </div>
    );
  }

  // Safe fallback if data structure is not fully loaded
  const data = filteredStats || stats || {
    leads: {
      totalRegisteredWhatsapp: 0,
      surveyStates: {
        finalizada: { count: 0, percentage: 0 },
        enCurso: { count: 0, percentage: 0 },
        cancelada: { count: 0, percentage: 0 },
        lis: { count: 0, percentage: 0 },
        enCero: { count: 0, percentage: 0 },
      },
      surveyLengths: {
        short: { count: 0, percentage: 0, finalizadaCount: 0 },
        long: { count: 0, percentage: 0, finalizadaCount: 0 },
      },
      averageIterations: 0,
      adaptogens: {
        Pts_Melena: { average: 0, total: 0 },
        Pts_Cordy: { average: 0, total: 0 },
        Pts_Reishi: { average: 0, total: 0 },
        Pts_Ashwa: { average: 0, total: 0 },
        winner: { name: '', average: 0, total: 0 },
      },
      rawLeads: [],
    },
    newFAQs: {
      totalQuestions: 0,
      questions: [],
    },
  };

  // Safe fallback if previous period data is not loaded
  const prevData = prevStats || {
    leads: {
      totalRegisteredWhatsapp: 0,
      surveyStates: {
        finalizada: { count: 0, percentage: 0 },
        enCurso: { count: 0, percentage: 0 },
        cancelada: { count: 0, percentage: 0 },
        lis: { count: 0, percentage: 0 },
        enCero: { count: 0, percentage: 0 },
      },
      surveyLengths: {
        short: { count: 0, percentage: 0, finalizadaCount: 0 },
        long: { count: 0, percentage: 0, finalizadaCount: 0 },
      },
      averageIterations: 0,
      adaptogens: {
        Pts_Melena: { average: 0, total: 0 },
        Pts_Cordy: { average: 0, total: 0 },
        Pts_Reishi: { average: 0, total: 0 },
        Pts_Ashwa: { average: 0, total: 0 },
        winner: { name: '', average: 0, total: 0 },
      },
      rawLeads: [],
    },
    newFAQs: {
      totalQuestions: 0,
      questions: [],
    },
  };

  // Calculate total leads (sum of state counts)
  const totalLeads = data.leads.surveyStates.finalizada.count +
    data.leads.surveyStates.enCurso.count +
    data.leads.surveyStates.cancelada.count +
    data.leads.surveyStates.lis.count +
    data.leads.surveyStates.enCero.count;

  // Prepare adaptogens array for ranking (sorted by total sum)
  const adaptogensList = [
    { key: 'Pts_Melena', name: 'Pts_Melena', total: data.leads.adaptogens.Pts_Melena.total, avg: data.leads.adaptogens.Pts_Melena.average },
    { key: 'Pts_Cordy', name: 'Pts_Cordy', total: data.leads.adaptogens.Pts_Cordy.total, avg: data.leads.adaptogens.Pts_Cordy.average },
    { key: 'Pts_Reishi', name: 'Pts_Reishi', total: data.leads.adaptogens.Pts_Reishi.total, avg: data.leads.adaptogens.Pts_Reishi.average },
    { key: 'Pts_Ashwa', name: 'Pts_Ashwa', total: data.leads.adaptogens.Pts_Ashwa.total, avg: data.leads.adaptogens.Pts_Ashwa.average },
  ].sort((a, b) => b.total - a.total);

  // Max total for gauge normalization
  const maxTotal = adaptogensList[0]?.total || 1;

  return (
    <div className={`app-container ${refreshing ? 'loading-skeleton' : ''}`}>

      {/* Error banner if credentials are not configured or request failed */}
      {error && (
        <div className="error-banner">
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <div>
              <span className="error-title">Atención:</span>
              <span style={{ marginLeft: '0.5rem' }}>{error}</span>
            </div>
          </div>
          <button className="btn-refresh" onClick={handleRefresh} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Reintentar</button>
        </div>
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="brand-section">
          <h1 className="brand-title">FungiStats</h1>
          <p className="brand-subtitle">Dashboard de Rendimiento, Leads y Preferencias de Adaptógenos</p>
        </div>

        <div className="action-section">
          <div className="badge badge-live">
            <span className="badge-dot"></span>
            Google Sheets Conectado
          </div>

          <button
            className="btn-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Actualizar datos"
          >
            <svg
              className={refreshing ? 'spin' : ''}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </header>

      {/* Control de Filtro de Fechas */}
      <section className="card filter-bar-card" style={{ marginBottom: '2.5rem' }}>
        <div className="filter-bar-content">
          <div className="filter-title-group">
            <span className="filter-icon">📅</span>
            <div>
              <h2 className="filter-heading">Rango de Fechas</h2>
              <p className="filter-subheading">Establece el rango para recalcular estadísticas y porcentajes</p>
            </div>
          </div>
          
          <div className="filter-actions-group">
            <div className="preset-buttons">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'today', label: 'Hoy' },
                { id: '7d', label: 'Últimos 7 días' },
                { id: '30d', label: 'Últimos 30 días' },
                { id: 'thisMonth', label: 'Este mes' },
                { id: 'custom', label: 'Personalizado' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  className={`btn-preset ${activePreset === preset.id ? 'active' : ''}`}
                  onClick={() => handlePresetChange(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="date-inputs-group">
              <div className="date-input-field">
                <label className="date-label" htmlFor="filter-start-date">Desde</label>
                <input
                  id="filter-start-date"
                  type="date"
                  className="date-input"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActivePreset('custom');
                  }}
                />
              </div>

              <div className="date-input-field">
                <label className="date-label" htmlFor="filter-end-date">Hasta</label>
                <input
                  id="filter-end-date"
                  type="date"
                  className="date-input"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActivePreset('custom');
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KPIs Grid */}
      <section className="kpis-grid" aria-label="Indicadores Clave de Rendimiento">
        <div className="card kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Leads Registrados</span>
            <span className="kpi-icon">📱</span>
          </div>
          <div>
            <div className="kpi-value-container" style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="kpi-value">{data.leads.totalRegisteredWhatsapp}</div>
              {renderComparison(data.leads.totalRegisteredWhatsapp, prevData.leads.totalRegisteredWhatsapp)}
            </div>
            <div className="kpi-footer">WhatsApp IDs únicos registrados</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Iteración Promedio</span>
            <span className="kpi-icon">🔄</span>
          </div>
          <div>
            <div className="kpi-value-container" style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="kpi-value">{data.leads.averageIterations.toFixed(2)}</div>
              {renderComparison(data.leads.averageIterations, prevData.leads.averageIterations)}
            </div>
            <div className="kpi-footer">Iteraciones de marketing por usuario</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Adaptógeno Ganador</span>
            <span className="kpi-icon">👑</span>
          </div>
          <div>
            <div className="kpi-value" style={{ fontSize: '1.65rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {getAdaptogenDisplayName(data.leads.adaptogens.winner.name) || 'Ninguno'}
            </div>
            <div className="kpi-footer">
              Total de puntos acumulados:{' '}
              <span className="kpi-footer-highlight" style={{ color: 'var(--accent)' }}>
                {data.leads.adaptogens.winner.total} pts
              </span>
            </div>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">New FAQs Detectadas</span>
            <span className="kpi-icon">❓</span>
          </div>
          <div>
            <div className="kpi-value">{data.newFAQs.totalQuestions}</div>
            <div className="kpi-footer">Posibles preguntas frecuentes en newFAQs</div>
          </div>
        </div>
      </section>

      {/* Main Dashboard Grid */}
      <main className="dashboard-grid">

        {/* Left Side: Survey Funnel and Averages */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} aria-label="Resultados de Encuestas">

          {/* Survey States Progress */}
          <div className="card">
            <h2 className="section-title">
              <span>📊</span> Estado de Encuestas
            </h2>
            <div className="space-y-4" style={{ marginTop: '1.5rem' }}>
              <div className="state-progress-item">
                <div className="state-meta">
                  <span className="state-label">Finalizadas</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="state-numbers">
                      {data.leads.surveyStates.finalizada.count}{' '}
                      <span className="state-percentage">({data.leads.surveyStates.finalizada.percentage.toFixed(1)}%)</span>
                    </span>
                    {renderComparison(data.leads.surveyStates.finalizada.count, prevData.leads.surveyStates.finalizada.count)}
                  </div>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill fill-finalizada"
                    style={{ width: `${data.leads.surveyStates.finalizada.percentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="state-progress-item">
                <div className="state-meta">
                  <span className="state-label">En Curso</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="state-numbers">
                      {data.leads.surveyStates.enCurso.count}{' '}
                      <span className="state-percentage">({data.leads.surveyStates.enCurso.percentage.toFixed(1)}%)</span>
                    </span>
                    {renderComparison(data.leads.surveyStates.enCurso.count, prevData.leads.surveyStates.enCurso.count)}
                  </div>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill fill-en-curso"
                    style={{ width: `${data.leads.surveyStates.enCurso.percentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="state-progress-item">
                <div className="state-meta">
                  <span className="state-label">Canceladas</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="state-numbers">
                      {data.leads.surveyStates.cancelada.count}{' '}
                      <span className="state-percentage">({data.leads.surveyStates.cancelada.percentage.toFixed(1)}%)</span>
                    </span>
                    {renderComparison(data.leads.surveyStates.cancelada.count, prevData.leads.surveyStates.cancelada.count)}
                  </div>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill fill-cancelada"
                    style={{ width: `${data.leads.surveyStates.cancelada.percentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="state-progress-item">
                <div className="state-meta">
                  <span className="state-label">Lis</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="state-numbers">
                      {data.leads.surveyStates.lis.count}{' '}
                      <span className="state-percentage">({data.leads.surveyStates.lis.percentage.toFixed(1)}%)</span>
                    </span>
                    {renderComparison(data.leads.surveyStates.lis.count, prevData.leads.surveyStates.lis.count)}
                  </div>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill fill-lis"
                    style={{ width: `${data.leads.surveyStates.lis.percentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="state-progress-item">
                <div className="state-meta">
                  <span className="state-label">No iniciadas</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="state-numbers">
                      {data.leads.surveyStates.enCero.count}{' '}
                      <span className="state-percentage">({data.leads.surveyStates.enCero.percentage.toFixed(1)}%)</span>
                    </span>
                    {renderComparison(data.leads.surveyStates.enCero.count, prevData.leads.surveyStates.enCero.count)}
                  </div>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill fill-en-cero"
                    style={{ width: `${data.leads.surveyStates.enCero.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Survey Type Distribution */}
          <div className="card">
            <h2 className="section-title">
              <span>🎯</span> Tipo de Encuesta
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Distribución de usuarios según completaron la encuesta corta (c) o larga (l).
            </p>
            <div className="survey-length-container">
              <div className="length-option-card">
                <span className="length-icon">⚡</span>
                <span className="length-title">Encuesta Corta (C)</span>
                <div className="length-val text-short">{data.leads.surveyLengths.short.count}</div>
                <div className="length-pct text-short">{data.leads.surveyLengths.short.percentage.toFixed(1)}%</div>
                <div style={{ fontSize: '0.825rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> {data.leads.surveyLengths.short.finalizadaCount} finalizadas ({data.leads.surveyLengths.short.count > 0 ? ((data.leads.surveyLengths.short.finalizadaCount / data.leads.surveyLengths.short.count) * 100).toFixed(1) : '0.0'}%)
                </div>
                {renderComparison(data.leads.surveyLengths.short.count, prevData.leads.surveyLengths.short.count)}
              </div>

              <div className="length-option-card">
                <span className="length-icon">📚</span>
                <span className="length-title">Encuesta Larga (L)</span>
                <div className="length-val text-long">{data.leads.surveyLengths.long.count}</div>
                <div className="length-pct text-long">{data.leads.surveyLengths.long.percentage.toFixed(1)}%</div>
                <div style={{ fontSize: '0.825rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> {data.leads.surveyLengths.long.finalizadaCount} finalizadas ({data.leads.surveyLengths.long.count > 0 ? ((data.leads.surveyLengths.long.finalizadaCount / data.leads.surveyLengths.long.count) * 100).toFixed(1) : '0.0'}%)
                </div>
                {renderComparison(data.leads.surveyLengths.long.count, prevData.leads.surveyLengths.long.count)}
              </div>
            </div>
          </div>

          {/* Card: Modificar Estado */}
          <div className="card modify-state-card">
            <h2 className="section-title">
              <span>⚙️</span> Modificar Estado
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Busca un lead por su Whatsapp ID para actualizar su estado.
            </p>
            <div className="modify-state-form">
              {/* Dynamic search input */}
              <div className="search-group" style={{ position: 'relative' }}>
                <label htmlFor="lead-search" className="input-label">Buscar Whatsapp ID</label>
                <input
                  id="lead-search"
                  type="text"
                  className="form-input"
                  placeholder="Escribe el número de Whatsapp..."
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchTerm(value);
                    if (value.trim() === '') {
                      setSelectedLead(null);
                    } else {
                      const match = data.leads.rawLeads.find(l => l.whatsappId === value.trim());
                      if (match) {
                        setSelectedLead(match);
                      } else {
                        setSelectedLead(null);
                      }
                    }
                    setUpdateFeedback(null);
                  }}
                />
                
                {/* Suggestions list */}
                {searchTerm.trim() !== '' && !selectedLead && (
                  <div className="search-suggestions">
                    {data.leads.rawLeads
                      .filter(l => l.whatsappId.includes(searchTerm.trim()))
                      .slice(0, 5)
                      .map(l => (
                        <div
                          key={l.whatsappId}
                          className="suggestion-item"
                          onClick={() => {
                            setSearchTerm(l.whatsappId);
                            setSelectedLead(l);
                            setUpdateFeedback(null);
                          }}
                        >
                          <span className="suggestion-id">{l.whatsappId}</span>
                          <span className="suggestion-status">{l.status || 'Sin estado'}</span>
                        </div>
                      ))}
                    {data.leads.rawLeads.filter(l => l.whatsappId.includes(searchTerm.trim())).length === 0 && (
                      <div className="suggestion-empty">No se encontraron resultados</div>
                    )}
                  </div>
                )}
              </div>

              {/* Read-only status field */}
              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <label className="input-label">Estado Actual</label>
                <input
                  type="text"
                  readOnly
                  className="form-input read-only-input"
                  value={selectedLead ? selectedLead.status || '(Sin estado)' : ''}
                  placeholder="Selecciona un lead para ver su estado..."
                />
              </div>

              {/* Action buttons */}
              <div className="action-buttons-group" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                <button
                  className="btn-action btn-primary-action"
                  onClick={() => handleUpdateStatus('Lis')}
                  disabled={!selectedLead || isUpdating}
                >
                  Pasar a Lis
                </button>
                <button
                  className="btn-action btn-secondary-action"
                  onClick={() => handleUpdateStatus('CERO')}
                  disabled={!selectedLead || selectedLead.status.toUpperCase() !== 'LIS' || isUpdating}
                >
                  Pasar a Bot
                </button>
              </div>

              {/* Feedback Message */}
              {updateFeedback && (
                <div className={`feedback-message ${updateFeedback.success ? 'feedback-success' : 'feedback-error'}`} style={{ marginTop: '1rem' }}>
                  {updateFeedback.success ? '✅' : '❌'} {updateFeedback.message}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Side: Adaptogens preference ranking and winner */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} aria-label="Ranking de Adaptógenos">



          {/* Ranking list of adaptogens */}
          <div className="card">
            <h2 className="section-title">
              <span>🍄</span> Ranking de Preferencias
            </h2>
            <div className="adaptogens-list" style={{ marginTop: '1.5rem' }}>
              {adaptogensList.map((item, idx) => (
                <div className="adaptogen-item" key={item.name}>
                  <div className="adaptogen-name-wrapper">
                    <span className="adaptogen-display-name">{getAdaptogenDisplayName(item.name)}</span>
                    <span className="adaptogen-raw-name">{item.name}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div className="adaptogen-gauge">
                      <div
                        className={`adaptogen-gauge-fill gauge-${item.name.replace('Pts_', '')}`}
                        style={{ width: `${Math.round((item.total / maxTotal) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="adaptogen-score">
                    {item.total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQs List panel */}
          <div className="card">
            <h2 className="section-title">
              <span>💡</span> Posibles FAQs ({data.newFAQs.totalQuestions})
            </h2>
            <div style={{ marginTop: '1.25rem' }}>
              {data.newFAQs.questions.length > 0 ? (
                <>
                  <div className="faq-list">
                    {data.newFAQs.questions.map((faq, idx) => (
                      <div className="faq-item" key={idx}>
                        <span className="faq-bullet">?</span>
                        <div className="faq-text">{faq}</div>
                        <button
                          className="btn-delete-faq"
                          onClick={() => handleDeleteFaq(faq)}
                          disabled={deletingFaq !== null}
                          title="Eliminar esta FAQ"
                        >
                          {deletingFaq === faq ? (
                            <span className="spin" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid transparent', borderTopColor: 'var(--danger)', borderRadius: '50%' }}></span>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                  {faqFeedback && (
                    <div className="faq-feedback-container">
                      <div className={`feedback-message ${faqFeedback.success ? 'feedback-success' : 'feedback-error'}`}>
                        {faqFeedback.success ? '✅' : '❌'} {faqFeedback.message}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="faq-empty">
                  No se han registrado preguntas en newFAQs.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <div>
          FungiStats v1.0.0 | Desarrollado para análisis de leads fúngicos.
        </div>
        <div>
          <span style={{ marginRight: '1rem' }}>Estado: </span>
          <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); handleRefresh(); }}>
            Refrescar ahora
          </a>
        </div>
      </footer>
    </div>
  );
}
