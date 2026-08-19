"use client";

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import type { DashboardStats } from '@/lib/types';

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

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<Kpis>({
    totalToday: 0,
    pending: 0,
    delivery: 0,
    delivered: 0,
    revenue: 0,
  });
  const [profile, setProfile] = useState<AdminProfile | null>(null);

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

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    async function loadStats() {
      try {
        const data = await apiFetch<DashboardStats>('/commandes/dashboard-stats', { token });
        setKpis({
          totalToday: data.totalCommandesDuJour,
          pending: data.commandesEnAttente,
          delivery: data.commandesEnCours,
          delivered: data.commandesLivrees,
          revenue: data.montantTotalDuJour,
        });
      } catch (err) {
        console.error('Error fetching KPIs', err);
      }
    }
    async function loadProfile() {
      try {
        const data = await apiFetch<AdminProfile>('/auth/profile', { token });
        setProfile(data);
      } catch (err) {
        console.error('Error fetching admin profile', err);
      }
    }
    loadStats();
    loadProfile();
  }, []);

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
      <div className="kpi-grid">
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
            <span className="kpi-value">{kpis.revenue.toLocaleString()} FCFA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
