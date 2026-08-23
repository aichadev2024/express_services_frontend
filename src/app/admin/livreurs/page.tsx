"use client";

import { useState, useEffect, type FormEvent } from 'react';
import PhoneInput from '@/components/PhoneInput';
import { apiFetch } from '@/lib/api';
import { useToasts, ToastContainer } from '@/components/Toast';
import { useStoredToken } from '@/lib/authToken';
import type { Livreur, DailyDeliveryStats, LivreurDailyStat } from '@/lib/types';

export default function AdminLivreurs() {
  const token = useStoredToken('admin_token');
  const [drivers, setDrivers] = useState<Livreur[]>([]);
  const { toasts, showToast } = useToasts();

  const [driverUsername, setDriverUsername] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  const [driverConfirmPassword, setDriverConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [driverNom, setDriverNom] = useState('');
  const [driverPrenom, setDriverPrenom] = useState('');
  const [driverTelephone, setDriverTelephone] = useState('');

  // Newly created credentials notification banner
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string;
    password: string;
    hasEmail: boolean;
  } | null>(null);

  // Daily statistics for driver assignment filter
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dailyStats, setDailyStats] = useState<DailyDeliveryStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadDrivers = async () => {
    try {
      setDrivers(await apiFetch<Livreur[]>('/auth/livreurs', { token }));
    } catch (err) {
      showToast('Erreur lors du chargement des livreurs.', 'error');
    }
  };

  const loadDailyStats = async (dateStr: string) => {
    if (!token) return;
    setLoadingStats(true);
    try {
      const stats = await apiFetch<DailyDeliveryStats>(`/commandes/daily-stats?date=${dateStr}`, { token });
      setDailyStats(stats);
    } catch (err) {
      showToast('Erreur lors du chargement des statistiques quotidiennes.', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadDrivers();
    loadDailyStats(selectedDate);
  }, [token, selectedDate]);

  const handleDriverSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (driverPassword.length < 6) {
      showToast('Le mot de passe doit faire au moins 6 caractères.', 'error');
      return;
    }

    if (driverPassword !== driverConfirmPassword) {
      showToast('Les mots de passe ne correspondent pas.', 'error');
      return;
    }

    const hasEmail = driverEmail.trim().length > 0;
    const payload = {
      username: driverUsername,
      email: hasEmail ? driverEmail.trim() : null,
      password: driverPassword,
      nom: driverNom,
      prenom: driverPrenom,
      telephone: driverTelephone,
    };

    try {
      await apiFetch('/auth/register-livreur', { method: 'POST', token, body: payload });
      showToast('Compte livreur créé avec succès.');
      
      setCreatedCredentials({
        username: driverUsername,
        password: driverPassword,
        hasEmail,
      });

      setDriverUsername('');
      setDriverEmail('');
      setDriverPassword('');
      setDriverConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setDriverNom('');
      setDriverPrenom('');
      setDriverTelephone('');
      loadDrivers();
      loadDailyStats(selectedDate);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur de création de compte livreur.', 'error');
    }
  };

  return (
    <div className="subtab-pane active">
      {/* Banner for newly created driver credentials */}
      {createdCredentials && (
        <div className="card glass-card" style={{ marginBottom: '20px', borderLeft: '4px solid var(--primary-color)', background: 'rgba(37, 99, 235, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-key"></i> Identifiants de Connexion Générés
              </h3>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}>
                Communiquez directement ces identifiants au livreur :
              </p>
              <div style={{ background: 'var(--card-bg, #1e293b)', padding: '12px 16px', borderRadius: '8px', display: 'inline-block', border: '1px solid var(--border-color, #334155)' }}>
                <div><strong>Identifiant (Username) :</strong> <code style={{ fontSize: '1.05rem', color: '#38bdf8' }}>{createdCredentials.username}</code></div>
                <div style={{ marginTop: '4px' }}><strong>Mot de passe :</strong> <code style={{ fontSize: '1.05rem', color: '#4ade80' }}>{createdCredentials.password}</code></div>
                <div style={{ marginTop: '6px', fontSize: '0.85rem', color: createdCredentials.hasEmail ? '#f59e0b' : '#38bdf8' }}>
                  <i className={createdCredentials.hasEmail ? "fa-solid fa-envelope" : "fa-solid fa-bolt"}></i> Mode de connexion : {createdCredentials.hasEmail ? "Vérification OTP envoyée par e-mail" : "Connexion directe immédiate (Sans OTP)"}
                </div>
              </div>
            </div>
            <button
              onClick={() => setCreatedCredentials(null)}
              className="btn btn-sm btn-outline"
              style={{ padding: '4px 8px' }}
              title="Fermer"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      {/* Daily Driver Assignments & Filter */}
      <div className="card glass-card" style={{ marginBottom: '25px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="card-icon"><i className="fa-solid fa-calendar-day"></i></div>
            <div>
              <h2 style={{ margin: 0 }}>Assignations & Activités Quotidiennes par Livreur</h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filtrer les livraisons et frais encaissés par jour</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Date :</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
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

        <div className="table-responsive" style={{ marginTop: '15px' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Livreur</th>
                <th>Téléphone</th>
                <th>Assignées le Jour</th>
                <th>Livraisons Effectuées</th>
                <th>Frais de Livraison (FCFA)</th>
                <th>Total Marchandises (FCFA)</th>
                <th>Total Encaissé (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              {loadingStats ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Chargement des données du {selectedDate}...</td>
                </tr>
              ) : !dailyStats || dailyStats.livreursStats.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Aucun livreur répertorié pour la date sélectionnée.</td>
                </tr>
              ) : (
                dailyStats.livreursStats.map((st: LivreurDailyStat) => (
                  <tr key={st.livreurId}>
                    <td>
                      <strong>{st.livreurPrenom} {st.livreurNom}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{st.livreurUsername}</div>
                    </td>
                    <td>{st.livreurTelephone || <span className="text-muted">—</span>}</td>
                    <td>
                      <span className="badge badge-info">{st.nombreLivraisonsAssignees} colis</span>
                    </td>
                    <td>
                      <span className="badge badge-success">{st.nombreLivraisonsLivrees} livrées</span>
                    </td>
                    <td>
                      <strong style={{ color: '#38bdf8' }}>
                        {Number(st.totalFraisLivraison).toLocaleString('fr-FR')} FCFA
                      </strong>
                    </td>
                    <td>
                      <span>{Number(st.totalMontantMarchandises).toLocaleString('fr-FR')} FCFA</span>
                    </td>
                    <td>
                      <strong style={{ color: '#4ade80' }}>
                        {Number(st.totalMontantGlobal).toLocaleString('fr-FR')} FCFA
                      </strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="stock-grid">
        {/* Drivers list */}
        <div className="card glass-card table-card">
          <div className="card-header">
            <div className="card-icon"><i className="fa-solid fa-truck"></i></div>
            <h2>Livreurs Enregistrés</h2>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Utilisateur</th>
                  <th>Nom Complet</th>
                  <th>E-mail</th>
                  <th>Mode Connexion</th>
                  <th>Téléphone</th>
                </tr>
              </thead>
              <tbody>
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center' }}>Aucun livreur enregistré.</td>
                  </tr>
                ) : (
                  drivers.map(d => {
                    const hasEmail = Boolean(d.email && d.email.trim().length > 0);
                    return (
                      <tr key={d.id}>
                        <td><strong>#{d.id}</strong></td>
                        <td><span className="text-muted">@{d.username}</span></td>
                        <td><strong>{d.prenom} {d.nom}</strong></td>
                        <td>{d.email || <span className="text-muted">Aucun</span>}</td>
                        <td>
                          {hasEmail ? (
                            <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                              <i className="fa-solid fa-envelope"></i> OTP par Mail
                            </span>
                          ) : (
                            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                              <i className="fa-solid fa-bolt"></i> Direct sans OTP
                            </span>
                          )}
                        </td>
                        <td>{d.telephone || <span className="text-muted">—</span>}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Register new driver account */}
        <div className="card glass-card stock-control-card">
          <div className="card-header">
            <div className="card-icon"><i className="fa-solid fa-user-plus"></i></div>
            <h2>Enregistrer un Nouveau Livreur</h2>
          </div>

          <div style={{ marginBottom: '15px', padding: '10px 12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', borderLeft: '3px solid #3b82f6', fontSize: '0.85rem' }}>
            <i className="fa-solid fa-circle-info" style={{ marginRight: '6px', color: '#3b82f6' }}></i>
            <strong>Email Optionnel :</strong> Si le livreur n'a pas d'e-mail, laissez le champ vide. Il pourra se connecter directement avec son nom d'utilisateur et son mot de passe.
          </div>

          <form onSubmit={handleDriverSubmit} className="form-grid">
            <div className="form-group">
              <label>Nom d'Utilisateur <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                value={driverUsername}
                onChange={(e) => setDriverUsername(e.target.value)}
                required
                placeholder="Ex: amadou_livreur"
              />
            </div>

            <div className="form-group">
              <label>E-mail du Livreur <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.8rem' }}>(Optionnel)</span></label>
              <input
                type="email"
                value={driverEmail}
                onChange={(e) => setDriverEmail(e.target.value)}
                placeholder="Ex: amadou@express.com (Optionnel)"
              />
            </div>

            <div className="form-group full-width">
              <label>Mot de Passe <span style={{ color: 'red' }}>*</span></label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={driverPassword}
                  onChange={(e) => setDriverPassword(e.target.value)}
                  required
                  placeholder="Min. 6 caractères"
                  style={{ width: '100%', paddingRight: '45px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className={showPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                </button>
              </div>
            </div>

            <div className="form-group full-width">
              <label>Confirmer le Mot de Passe <span style={{ color: 'red' }}>*</span></label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={driverConfirmPassword}
                  onChange={(e) => setDriverConfirmPassword(e.target.value)}
                  required
                  placeholder="Ressaisir le mot de passe"
                  style={{ width: '100%', paddingRight: '45px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className={showConfirmPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Nom <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                value={driverNom}
                onChange={(e) => setDriverNom(e.target.value)}
                required
                placeholder="Ex: Diarra"
              />
            </div>

            <div className="form-group">
              <label>Prénom <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                value={driverPrenom}
                onChange={(e) => setDriverPrenom(e.target.value)}
                required
                placeholder="Ex: Amadou"
              />
            </div>

            <div className="form-group full-width">
              <label>Numéro de Téléphone <span style={{ color: 'red' }}>*</span></label>
              <PhoneInput
                value={driverTelephone}
                onChange={setDriverTelephone}
                required
                placeholder="70 00 00 00"
              />
            </div>

            <div className="form-actions full-width" style={{ marginTop: '15px' }}>
              <button type="submit" className="btn btn-primary full-width">
                <i className="fa-solid fa-user-check"></i> Créer le Compte Livreur
              </button>
            </div>
          </form>
        </div>

      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}

