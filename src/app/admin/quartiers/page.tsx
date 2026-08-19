"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { useStoredToken } from '@/lib/authToken';
import { useToasts } from '@/components/Toast';

interface Quartier {
  id: number;
  nom: string;
  tarifLivraison: number;
}

export default function AdminQuartiersPage() {
  const token = useStoredToken('admin_token');
  const { showToast } = useToasts();

  const [quartiers, setQuartiers] = useState<Quartier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form State pour Création / Édition
  const [nom, setNom] = useState('');
  const [tarifLivraison, setTarifLivraison] = useState<number | ''>(1000);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadQuartiers = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Quartier[]>('/quartiers');
      setQuartiers(data || []);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du chargement des quartiers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuartiers();
  }, []);

  const handleCreateOrUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nom.trim()) {
      setFormError('Le nom du quartier est requis.');
      return;
    }
    if (tarifLivraison === '' || tarifLivraison < 0) {
      setFormError('Le tarif de livraison doit être un nombre positif.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        // Modification
        await apiFetch<Quartier>(`/quartiers/${editingId}`, {
          method: 'PUT',
          token,
          body: { nom: nom.trim(), tarifLivraison: Number(tarifLivraison) },
        });
        showToast(`Quartier "${nom}" mis à jour avec succès !`);
      } else {
        // Création
        await apiFetch<Quartier>('/quartiers', {
          method: 'POST',
          token,
          body: { nom: nom.trim(), tarifLivraison: Number(tarifLivraison) },
        });
        showToast(`Quartier "${nom}" créé avec succès !`);
      }

      setNom('');
      setTarifLivraison(1000);
      setEditingId(null);
      loadQuartiers();
    } catch (err: any) {
      setFormError(err.message || 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (q: Quartier) => {
    setEditingId(q.id);
    setNom(q.nom);
    setTarifLivraison(q.tarifLivraison);
    setFormError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNom('');
    setTarifLivraison(1000);
    setFormError('');
  };

  const handleDelete = async (q: Quartier) => {
    if (!confirm(`Voulez-vous vraiment supprimer le quartier "${q.nom}" ?`)) return;

    try {
      await apiFetch(`/quartiers/${q.id}`, {
        method: 'DELETE',
        token,
      });
      showToast(`Quartier "${q.nom}" supprimé.`);
      loadQuartiers();
    } catch (err: any) {
      showToast(err.message || 'Impossible de supprimer ce quartier.', 'error');
    }
  };

  const filteredQuartiers = quartiers.filter((q) =>
    q.nom.toLowerCase().includes(search.toLowerCase())
  );

  const averageTarif = quartiers.length
    ? Math.round(quartiers.reduce((acc, q) => acc + q.tarifLivraison, 0) / quartiers.length)
    : 0;

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary, #0d2149)', margin: 0 }}>
            <i className="fa-solid fa-location-dot" style={{ marginRight: '10px', color: 'var(--color-primary, #0d2149)' }}></i>
            Gestion des Quartiers de Livraison
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            Ajoutez et gérez les tarifs de livraison par quartier dans le district de Bamako.
          </p>
        </div>
      </div>

      {/* Cartes KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Total Quartiers</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0d2149', marginTop: '4px' }}>{quartiers.length}</div>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Tarif Moyen de Livraison</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>{averageTarif.toLocaleString()} FCFA</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Formulaire Ajouter / Modifier Quartier */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0d2149', marginTop: 0, marginBottom: '16px' }}>
            <i className={`fa-solid ${editingId ? 'fa-pen-to-square' : 'fa-plus-circle'}`} style={{ marginRight: '8px' }}></i>
            {editingId ? 'Modifier le Quartier' : 'Ajouter un Quartier'}
          </h2>

          {formError && (
            <div style={{ padding: '10px 12px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '14px' }}>
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateOrUpdate}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Nom du Quartier *
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Hippodrome, Badalabougou..."
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Tarif de livraison (FCFA) *
              </label>
              <input
                type="number"
                value={tarifLivraison}
                onChange={(e) => setTarifLivraison(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ex: 1000"
                min={0}
                step={100}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ flex: 1, backgroundColor: '#0d2149', borderColor: '#0d2149', color: '#fff', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {isSubmitting ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Ajouter le Quartier'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn btn-secondary"
                  style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Liste des Quartiers */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0d2149', margin: 0 }}>
              Liste des Quartiers ({filteredQuartiers.length})
            </h2>
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un quartier..."
                style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '12px' }}></i>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
              <p style={{ marginTop: '10px', fontSize: '14px' }}>Chargement des quartiers...</p>
            </div>
          ) : filteredQuartiers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <i className="fa-solid fa-location-dot fa-2x" style={{ marginBottom: '10px' }}></i>
              <p style={{ margin: 0, fontSize: '14px' }}>Aucun quartier trouvé.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Nom du Quartier</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tarif Livraison</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuartiers.map((q) => (
                    <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: editingId === q.id ? '#f0f9ff' : 'transparent' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0d2149' }}>
                        <i className="fa-solid fa-location-dot" style={{ marginRight: '8px', color: '#0d2149', opacity: 0.7 }}></i>
                        {q.nom}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#10b981', fontWeight: 'bold' }}>
                        {q.tarifLivraison.toLocaleString()} FCFA
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleEdit(q)}
                          title="Modifier"
                          style={{ background: 'none', border: 'none', color: '#0d2149', cursor: 'pointer', padding: '6px 10px', fontSize: '14px' }}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(q)}
                          title="Supprimer"
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px 10px', fontSize: '14px' }}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
