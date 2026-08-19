"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { useToasts, ToastContainer } from '@/components/Toast';
import { useStoredToken } from '@/lib/authToken';
import type { Partenaire } from '@/lib/types';

export default function AdminPartenaires() {
  const token = useStoredToken('admin_token');
  const [partenaires, setPartenaires] = useState<Partenaire[]>([]);
  const { toasts, showToast } = useToasts();

  const [partenaireId, setPartenaireId] = useState('');
  const [partenaireNom, setPartenaireNom] = useState('');
  const [partenaireTelephone, setPartenaireTelephone] = useState('');

  const loadPartenaires = async () => {
    try {
      setPartenaires(await apiFetch<Partenaire[]>('/partenaires'));
    } catch (err) {
      showToast('Erreur lors du chargement des partenaires.', 'error');
    }
  };

  useEffect(() => {
    if (!token) return;
    loadPartenaires();
  }, [token]);

  const handleEditPartenaireClick = (p: Partenaire) => {
    setPartenaireId(String(p.id));
    setPartenaireNom(p.nom);
    setPartenaireTelephone(p.telephone);
  };

  const handlePartenaireFormCancel = () => {
    setPartenaireId('');
    setPartenaireNom('');
    setPartenaireTelephone('');
  };

  const handlePartenaireSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = { nom: partenaireNom, telephone: partenaireTelephone };

    try {
      await apiFetch(partenaireId ? `/partenaires/${partenaireId}` : '/partenaires', {
        method: partenaireId ? 'PUT' : 'POST',
        token,
        body: payload,
      });
      showToast(partenaireId ? 'Partenaire mis à jour avec succès.' : 'Nouveau partenaire créé.');
      handlePartenaireFormCancel();
      loadPartenaires();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde du partenaire.', 'error');
    }
  };

  return (
    <div className="subtab-pane active">
      <div className="stock-grid">

        {/* Partenaires list */}
        <div className="card glass-card table-card">
          <div className="card-header">
            <div className="card-icon"><i className="fa-solid fa-handshake"></i></div>
            <h2>Partenaires Enregistrés</h2>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom</th>
                  <th>Téléphone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {partenaires.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center' }}>Aucun partenaire enregistré.</td>
                  </tr>
                ) : (
                  partenaires.map(p => (
                    <tr key={p.id}>
                      <td><strong>#{p.id}</strong></td>
                      <td><strong>{p.nom}</strong></td>
                      <td><span className="text-muted"><i className="fa-solid fa-phone"></i> {p.telephone}</span></td>
                      <td>
                        <button onClick={() => handleEditPartenaireClick(p)} className="btn btn-secondary btn-sm">
                          <i className="fa-solid fa-pen-to-square"></i> Modifier
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit partenaire form */}
        <div className="card glass-card stock-control-card">
          <div className="card-header">
            <div className="card-icon"><i className="fa-solid fa-user-plus"></i></div>
            <h2>{partenaireId ? 'Modifier le Partenaire' : 'Créer un Partenaire'}</h2>
          </div>
          <form onSubmit={handlePartenaireSubmit} className="form-grid">
            <div className="form-group full-width">
              <label>Nom de la Boutique / Partenaire</label>
              <input
                type="text"
                value={partenaireNom}
                onChange={(e) => setPartenaireNom(e.target.value)}
                required
                placeholder="Ex: Boutique Parisienne"
              />
            </div>

            <div className="form-group full-width">
              <label>Téléphone</label>
              <input
                type="tel"
                value={partenaireTelephone}
                onChange={(e) => setPartenaireTelephone(e.target.value)}
                required
                placeholder="Ex: +223 76000000"
              />
            </div>

            <div className="form-actions full-width" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              {partenaireId && (
                <button type="button" onClick={handlePartenaireFormCancel} className="btn btn-secondary">Annuler</button>
              )}
              <button type="submit" className="btn btn-primary"><i className="fa-solid fa-save"></i> Enregistrer</button>
            </div>
          </form>
        </div>

      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}
