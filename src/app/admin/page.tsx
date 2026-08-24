"use client";

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import type { DashboardStats, DailyDeliveryStats, DailyHistoryStat, LivreurDailyStat, MonthlyDeliveryStats, PartenaireMonthlyStat, LivreurMonthlyStat } from '@/lib/types';
import { useStoredToken } from '@/lib/authToken';

interface Kpis {
  totalToday: number;
  pending: number;
  delivery: number;
  delivered: number;
  revenue: number;
}

interface AdminProfile {
  id: number;
  username: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DONUT_COLORS = ['#38bdf8', '#c084fc', '#4ade80', '#facc15', '#fb923c', '#f43f5e', '#818cf8', '#a3e635'];

export default function AdminDashboard() {
  const token = useStoredToken('admin_token');
  const [dataLoading, setDataLoading] = useState(true);
  const [kpis, setKpis] = useState<Kpis>({
    totalToday: 0,
    pending: 0,
    delivery: 0,
    delivered: 0,
    revenue: 0,
  });
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  // Daily statistics state
  const [statsDate, setStatsDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dailyStats, setDailyStats] = useState<DailyDeliveryStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Monthly statistics state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [monthlyStats, setMonthlyStats] = useState<MonthlyDeliveryStats | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const quote = useMemo(() => {
    const quotes = [
      "« La logistique n'est pas seulement le mouvement des marchandises ; c'est le fil invisible qui relie les personnes et concrétise les promesses. »",
      "« Chaque colis confié est une marque de confiance. Chaque livraison réussie est une preuve de notre excellence. »",
      "« Diriger, c'est prévoir. Organiser, c'est simplifier. Livrer, c'est satisfaire. »",
      "« La clé du succès logistique réside dans l'attention portée aux détails et la passion du service bien fait. »",
      "« Derrière chaque livraison réussie se cache un travail d'équipe rigoureux et un engagement inébranlable envers nos clients. »"
    ];
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
  }, []);

  const loadDailyDeliveryStats = async (dateStr: string) => {
    if (!token) return;
    setStatsLoading(true);
    try {
      const res = await apiFetch<DailyDeliveryStats>(`/commandes/daily-stats?date=${dateStr}`, { token });
      setDailyStats(res);
    } catch (err) {
      console.error('Error fetching daily delivery stats', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadMonthlyStats = async (yr: number, mth: number) => {
    if (!token) return;
    setMonthlyLoading(true);
    try {
      const res = await apiFetch<MonthlyDeliveryStats>(`/commandes/monthly-stats?year=${yr}&month=${mth}`, { token });
      setMonthlyStats(res);
    } catch (err) {
      console.error('Error fetching monthly stats', err);
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    async function loadInitialData() {
      try {
        const [statsData, profileData] = await Promise.all([
          apiFetch<DashboardStats>('/commandes/dashboard-stats', { token }).catch(() => null),
          apiFetch<AdminProfile>('/auth/profile', { token }).catch(() => null)
        ]);
        if (statsData) {
          setKpis({
            totalToday: statsData.totalCommandesDuJour ?? 0,
            pending: statsData.commandesEnAttente ?? 0,
            delivery: statsData.commandesEnCours ?? 0,
            delivered: statsData.commandesLivrees ?? 0,
            revenue: statsData.montantTotalDuJour ?? 0,
          });
        }
        if (profileData) {
          setProfile(profileData);
        }
      } catch (err) {
        console.error('Error fetching dashboard data', err);
      } finally {
        setDataLoading(false);
      }
    }
    loadInitialData();
    loadDailyDeliveryStats(statsDate);
    loadMonthlyStats(selectedYear, selectedMonth);

    const interval = setInterval(async () => {
      try {
        const data = await apiFetch<DashboardStats>('/commandes/dashboard-stats', { token });
        if (data) {
          setKpis({
            totalToday: data.totalCommandesDuJour ?? 0,
            pending: data.commandesEnAttente ?? 0,
            delivery: data.commandesEnCours ?? 0,
            delivered: data.commandesLivrees ?? 0,
            revenue: data.montantTotalDuJour ?? 0,
          });
        }
      } catch (err) {
        console.error('Error fetching KPIs', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadDailyDeliveryStats(statsDate);
  }, [token, statsDate]);

  useEffect(() => {
    if (!token) return;
    loadMonthlyStats(selectedYear, selectedMonth);
  }, [token, selectedYear, selectedMonth]);

  if (dataLoading) {
    return (
      <div className="subtab-pane active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '15px' }}>
        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '32px', color: 'var(--color-secondary)' }}></i>
        <span style={{ fontSize: '15px', color: 'var(--color-primary)', fontWeight: 600 }}>Chargement du tableau de bord...</span>
      </div>
    );
  }

  return (
    <div className="subtab-pane active">
      {/* Welcome Message & Admin Profile Panel */}
      <div className="dashboard-welcome-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px', marginBottom: '25px' }}>
        {/* Welcome & Quote Card */}
        <div className="welcome-motivational-card glass-card" style={{ background: '#ffffff', borderRadius: '20px', padding: '25px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(13,33,73,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '190px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Ravi de vous revoir, {profile ? `${profile.prenom} ${profile.nom}` : 'Administrateur'} ! <span className="wave-emoji" style={{ display: 'inline-block' }}>👋</span>
            </h2>
            <p style={{ fontSize: '14.5px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '15px' }}>
              Votre tableau de bord est prêt. Suivez en temps réel le traitement des commandes, la gestion des stocks de nos partenaires et pilotez l'activité des livreurs à Bamako.
            </p>
          </div>
          <div style={{ background: 'rgba(255, 30, 39, 0.03)', borderLeft: '4px solid var(--color-secondary)', padding: '12px 18px', borderRadius: '0 8px 8px 0', fontStyle: 'italic', color: 'var(--color-primary)', fontSize: '13.5px', fontWeight: 500, lineHeight: 1.4 }}>
            {quote}
          </div>
        </div>

        {/* Profile Details Card */}
        <div className="profile-mini-card glass-card" style={{ background: '#ffffff', borderRadius: '20px', padding: '25px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(13,33,73,0.02)', display: 'flex', alignItems: 'center', gap: '20px', minHeight: '190px' }}>
          <div className="profile-avatar-gradient" style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--color-primary) 0%, #1d3557 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, boxShadow: '0 6px 12px rgba(13,33,73,0.15)', flexShrink: 0 }}>
            {profile ? `${profile.prenom.charAt(0)}${profile.nom.charAt(0)}`.toUpperCase() : 'AD'}
          </div>
          <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '3px' }}>
              Administrateur
            </span>
            <h4 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-primary)', margin: '0 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile ? `${profile.prenom} ${profile.nom}` : 'Chargement...'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <i className="fa-solid fa-user" style={{ fontSize: '10px', width: '12px', color: 'var(--color-secondary)' }}></i> {profile?.username || '...'}
              </span>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <i className="fa-solid fa-envelope" style={{ fontSize: '10px', width: '12px', color: 'var(--color-secondary)' }}></i> {profile?.email || '...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Stats Grid */}
      <div className="kpi-grid" style={{ marginBottom: '30px' }}>
        <div className="kpi-card glass-card gradient-1">
          <div className="kpi-icon"><i className="fa-solid fa-calendar-day"></i></div>
          <div className="kpi-info">
            <span className="kpi-title">Commandes du Jour</span>
            <span className="kpi-value">{kpis.totalToday}</span>
          </div>
        </div>
        <div className="kpi-card glass-card status-kpi en-attente">
          <div className="kpi-icon"><i className="fa-solid fa-clock"></i></div>
          <div className="kpi-info">
            <span className="kpi-title">En Attente</span>
            <span className="kpi-value">{kpis.pending}</span>
          </div>
        </div>
        <div className="kpi-card glass-card status-kpi en-cours">
          <div className="kpi-icon"><i className="fa-solid fa-truck-ramp-box"></i></div>
          <div className="kpi-info">
            <span className="kpi-title">En Livraison</span>
            <span className="kpi-value">{kpis.delivery}</span>
          </div>
        </div>
        <div className="kpi-card glass-card status-kpi livree">
          <div className="kpi-icon"><i className="fa-solid fa-check-double"></i></div>
          <div className="kpi-info">
            <span className="kpi-title">Livrées</span>
            <span className="kpi-value">{kpis.delivered}</span>
          </div>
        </div>
        <div className="kpi-card glass-card gradient-2">
          <div className="kpi-icon"><i className="fa-solid fa-hand-holding-dollar"></i></div>
          <div className="kpi-info">
            <span className="kpi-title">Montant Total du Jour</span>
            <span className="kpi-value">{(kpis?.revenue ?? 0).toLocaleString()} FCFA</span>
          </div>
        </div>
      </div>

      {/* Daily Delivery Price Statistics Section */}
      <div className="card glass-card" style={{ marginBottom: '30px', padding: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-chart-line" style={{ color: '#38bdf8' }}></i> Statistiques du Prix des Livraisons par Jour
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Analyse détaillée des frais de livraison et chiffre d'affaires quotidien</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Date d'analyse :</label>
            <input
              type="date"
              value={statsDate}
              onChange={(e) => setStatsDate(e.target.value)}
              className="form-control"
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #334155)',
                background: 'var(--bg-input, #0f172a)',
                color: 'var(--text-color, #fff)'
              }}
            />
          </div>
        </div>

        {statsLoading ? (
          <div style={{ padding: '30px', textAlign: 'center' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginRight: '10px' }}></i>
            Chargement des statistiques de livraison du {statsDate}...
          </div>
        ) : dailyStats ? (
          <div>
            {/* Daily delivery breakdown summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '18px', borderRadius: '14px' }}>
                <span style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#38bdf8', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  Frais de Livraison Effectués
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>
                  {Number(dailyStats.totalFraisLivraison).toLocaleString('fr-FR')} FCFA
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Total des frais de livraison perçus (exclut les livraisons gratuites)
                </span>
              </div>

              <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.2)', padding: '18px', borderRadius: '14px' }}>
                <span style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#eab308', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  Livraisons Gratuites (Offertes)
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#eab308' }}>
                  {dailyStats.totalLivraisonsGratuites ?? 0}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Comptabilisées à 0 FCFA dans le total des frais de livraison
                </span>
              </div>

              <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '18px', borderRadius: '14px' }}>
                <span style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#c084fc', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  Montant des Marchandises
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#c084fc' }}>
                  {Number(dailyStats.totalMontantMarchandises).toLocaleString('fr-FR')} FCFA
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Valeur totale des produits livrés du jour
                </span>
              </div>

              <div style={{ background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.2)', padding: '18px', borderRadius: '14px' }}>
                <span style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#4ade80', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  Encaissement Global Du Jour
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80' }}>
                  {Number(dailyStats.totalMontantGlobal).toLocaleString('fr-FR')} FCFA
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Cumul Frais Livraison (Payantes) + Marchandises
                </span>
              </div>
            </div>

            {/* 7-Day History Trend Table */}
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-clock-rotate-left"></i> Historique des 7 Derniers Jours
              </h3>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Commandes Totales</th>
                      <th>Commandes Livrées</th>
                      <th>Frais de Livraison (FCFA)</th>
                      <th>Montant Marchandises (FCFA)</th>
                      <th>Total Encaissé (FCFA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyStats.historique7Jours.map((h: DailyHistoryStat) => (
                      <tr key={h.date} style={h.date === statsDate ? { background: 'rgba(56, 189, 248, 0.08)' } : {}}>
                        <td>
                          <strong>{new Date(h.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                          {h.date === statsDate && <span className="badge badge-info" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>Sélectionné</span>}
                        </td>
                        <td>{h.totalLivraisons}</td>
                        <td>
                          <span className="badge badge-success">{h.totalCommandesLivrees} livrées</span>
                        </td>
                        <td>
                          <strong style={{ color: '#38bdf8' }}>{Number(h.totalFraisLivraison).toLocaleString('fr-FR')} FCFA</strong>
                        </td>
                        <td>{Number(h.totalMontantMarchandises).toLocaleString('fr-FR')} FCFA</td>
                        <td>
                          <strong style={{ color: '#4ade80' }}>{Number(h.totalMontantGlobal).toLocaleString('fr-FR')} FCFA</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center' }}>Aucune donnée disponible pour cette date.</div>
        )}
      </div>

      {/* SECTION 2: Monthly Financial & Driver Performance Statistics */}
      <div className="card glass-card table-card" style={{ marginTop: '30px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="card-icon" style={{ background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc' }}>
              <i className="fa-solid fa-chart-pie"></i>
            </div>
            <div>
              <h2>Statistiques Mensuelles & Répartition des Gains</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Vue d'ensemble du chiffre d'affaires, partages partenaires et classement des livreurs
              </p>
            </div>
          </div>

          {/* Month & Year Selectors */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                padding: '8px 14px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              {MONTH_NAMES.map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>{mName}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                padding: '8px 14px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              {[2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
        </div>

        {monthlyLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginRight: '10px', color: '#c084fc' }}></i>
            Chargement des statistiques mensuelles de {MONTH_NAMES[selectedMonth - 1]} {selectedYear}...
          </div>
        ) : monthlyStats ? (
          <div style={{ marginTop: '10px' }}>
            {/* Top KPI Cards for Monthly Financial Performance */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '20px', borderRadius: '16px' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#38bdf8', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  <i className="fa-solid fa-building-columns" style={{ marginRight: '6px' }}></i> Gains Plateforme (Admin)
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8' }}>
                  {Number(monthlyStats.gainsPlateforme).toLocaleString('fr-FR')} FCFA
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Revenu total généré par les frais de livraison payantes ce mois
                </span>
              </div>

              <div style={{ background: 'rgba(192, 132, 252, 0.08)', border: '1px solid rgba(192, 132, 252, 0.25)', padding: '20px', borderRadius: '16px' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#c084fc', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  <i className="fa-solid fa-store" style={{ marginRight: '6px' }}></i> Gains Marchandises (Partenaires)
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c084fc' }}>
                  {Number(monthlyStats.gainsMarchandises).toLocaleString('fr-FR')} FCFA
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Total des ventes de produits enregistrées sur le mois
                </span>
              </div>

              <div style={{ background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.25)', padding: '20px', borderRadius: '16px' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#4ade80', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  <i className="fa-solid fa-wallet" style={{ marginRight: '6px' }}></i> Chiffre d'Affaires Global
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4ade80' }}>
                  {Number(monthlyStats.gainsGlobal).toLocaleString('fr-FR')} FCFA
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Frais de livraison + Ventes marchandises cumulés
                </span>
              </div>

              <div style={{ background: 'rgba(250, 204, 21, 0.08)', border: '1px solid rgba(250, 204, 21, 0.25)', padding: '20px', borderRadius: '16px' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#facc15', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  <i className="fa-solid fa-truck-ramp-box" style={{ marginRight: '6px' }}></i> Livraisons Effectuées
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#facc15' }}>
                  {monthlyStats.totalCommandesLivrees} / {monthlyStats.totalLivraisons}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  dont {monthlyStats.totalLivraisonsGratuites} livraisons gratuites offertes
                </span>
              </div>
            </div>

            {/* Split layout: Left Donut Chart, Right Top Drivers Podium */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '25px' }}>

              {/* LEFT: Donut / Camembert Chart for Gains Par Partenaire */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '22px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-chart-donut" style={{ color: '#c084fc' }}></i> Répartition des Ventes par Partenaire
                </h3>

                {monthlyStats.partenairesStats.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Aucune livraison partenaire enregistrée ce mois-ci.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    {/* SVG Donut Chart */}
                    <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                      <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="100" cy="100" r="70" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="24" />
                        {(() => {
                          let cumulativeOffset = 0;
                          const r = 70;
                          const circ = 2 * Math.PI * r;
                          return monthlyStats.partenairesStats.map((p, i) => {
                            const strokeDash = (p.pourcentageDuTotal / 100) * circ;
                            const offset = cumulativeOffset;
                            cumulativeOffset += strokeDash;
                            const color = DONUT_COLORS[i % DONUT_COLORS.length];
                            return (
                              <circle
                                key={p.partenaireId ?? i}
                                cx="100"
                                cy="100"
                                r={r}
                                fill="transparent"
                                stroke={color}
                                strokeWidth="24"
                                strokeDasharray={`${strokeDash} ${circ}`}
                                strokeDashoffset={-offset}
                                style={{ transition: 'stroke-dasharray 0.5s ease' }}
                              />
                            );
                          });
                        })()}
                      </svg>
                      {/* Center Info Text */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none'
                      }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ventes Marchandises</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#c084fc' }}>
                          {Number(monthlyStats.gainsMarchandises).toLocaleString('fr-FR')} F
                        </span>
                      </div>
                    </div>

                    {/* Partners Breakdown List / Legend */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                      {monthlyStats.partenairesStats.map((p, i) => {
                        const color = DONUT_COLORS[i % DONUT_COLORS.length];
                        return (
                          <div key={p.partenaireId ?? i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.06)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, display: 'inline-block' }}></span>
                              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{p.partenaireNom}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                background: `${color}20`,
                                color: color,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '20px'
                              }}>
                                {p.pourcentageDuTotal}%
                              </span>
                              <strong style={{ fontSize: '0.9rem' }}>
                                {Number(p.gainsPartenaire).toLocaleString('fr-FR')} FCFA
                              </strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Top Livreurs le Plus Actifs du Mois */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '22px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-trophy" style={{ color: '#facc15' }}></i> Livreurs les Plus Actifs du Mois
                </h3>

                {monthlyStats.topLivreurs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Aucune livraison effectuée par un livreur ce mois-ci.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {monthlyStats.topLivreurs.map((l: LivreurMonthlyStat) => {
                      const medal = l.rang === 1 ? '🥇' : l.rang === 2 ? '🥈' : l.rang === 3 ? '🥉' : `#${l.rang}`;
                      const badgeBg = l.rang === 1 ? 'rgba(250, 204, 21, 0.15)' : l.rang === 2 ? 'rgba(148, 163, 184, 0.15)' : l.rang === 3 ? 'rgba(251, 146, 60, 0.15)' : 'rgba(255,255,255,0.04)';
                      const badgeBorder = l.rang === 1 ? 'rgba(250, 204, 21, 0.3)' : l.rang === 2 ? 'rgba(148, 163, 184, 0.3)' : l.rang === 3 ? 'rgba(251, 146, 60, 0.3)' : 'rgba(255,255,255,0.08)';

                      return (
                        <div key={l.livreurId} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 16px',
                          background: badgeBg,
                          border: `1px solid ${badgeBorder}`,
                          borderRadius: '14px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>{medal}</span>
                            <div>
                              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                {l.livreurPrenom || l.livreurNom ? `${l.livreurPrenom || ''} ${l.livreurNom || ''}`.trim() : l.livreurUsername}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {l.livreurTelephone || '@' + l.livreurUsername}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#4ade80' }}>
                              {l.nombreLivraisons} livraisons
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Frais: <strong style={{ color: '#38bdf8' }}>{Number(l.totalFraisEncaisse).toLocaleString('fr-FR')} FCFA</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center' }}>Aucune donnée mensuelle disponible.</div>
        )}
      </div>
    </div>
  );
}

