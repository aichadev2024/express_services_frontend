"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { useToasts, ToastContainer } from '@/components/Toast';
import { useStoredToken } from '@/lib/authToken';
import type { Livreur } from '@/lib/types';

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

  const loadDrivers = async () => {
    try {
      setDrivers(await apiFetch<Livreur[]>('/auth/livreurs', { token }));
    } catch (err) {
      showToast('Erreur lors du chargement des livreurs.', 'error');
    }
  };

  useEffect(() => {
    if (!token) return;
    loadDrivers();
  }, [token]);

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

    const payload = {
      username: driverUsername,
      email: driverEmail,
      password: driverPassword,
      nom: driverNom,
      prenom: driverPrenom,
    };

    try {
      await apiFetch('/auth/register-livreur', { method: 'POST', token, body: payload });
      showToast('Compte livreur créé avec succès.');
      setDriverUsername('');
      setDriverEmail('');
      setDriverPassword('');
      setDriverConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setDriverNom('');
      setDriverPrenom('');
      loadDrivers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur de création de compte livreur.', 'error');
    }
  };

  return (
    <div className="subtab-pane active">
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
                  <th>Nom d'Utilisateur</th>
                  <th>Nom Complet</th>
                  <th>E-mail</th>
                  <th>Date de Création</th>
                </tr>
              </thead>
              <tbody>
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center' }}>Aucun livreur enregistré.</td>
                  </tr>
                ) : (
                  drivers.map(d => {
                    const formattedDate = new Date(d.dateCreation).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    });
                    return (
                      <tr key={d.id}>
                        <td><strong>#{d.id}</strong></td>
                        <td><span className="text-muted">@{d.username}</span></td>
                        <td><strong>{d.prenom} {d.nom}</strong></td>
                        <td>{d.email || <span className="text-muted">—</span>}</td>
                        <td>{formattedDate}</td>
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
          <form onSubmit={handleDriverSubmit} className="form-grid">
            <div className="form-group">
              <label>Nom d'Utilisateur</label>
              <input
                type="text"
                value={driverUsername}
                onChange={(e) => setDriverUsername(e.target.value)}
                required
                placeholder="Ex: amadou_livreur"
              />
            </div>

            <div className="form-group">
              <label>E-mail du Livreur</label>
              <input
                type="email"
                value={driverEmail}
                onChange={(e) => setDriverEmail(e.target.value)}
                required
                placeholder="Ex: amadou@express.com"
              />
            </div>

            <div className="form-group full-width">
              <label>Mot de Passe</label>
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
              <label>Confirmer le Mot de Passe</label>
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
              <label>Nom</label>
              <input
                type="text"
                value={driverNom}
                onChange={(e) => setDriverNom(e.target.value)}
                required
                placeholder="Ex: Diarra"
              />
            </div>

            <div className="form-group">
              <label>Prénom</label>
              <input
                type="text"
                value={driverPrenom}
                onChange={(e) => setDriverPrenom(e.target.value)}
                required
                placeholder="Ex: Amadou"
              />
            </div>

            <div className="form-actions full-width" style={{ marginTop: '15px' }}>
              <button type="submit" className="btn btn-primary full-width">
                <i className="fa-solid fa-user-check"></i> Créer le Compte
              </button>
            </div>
          </form>
        </div>

      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}
