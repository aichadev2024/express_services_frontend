"use client";

import { useState, useEffect, type ChangeEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { useToasts, ToastContainer } from '@/components/Toast';
import { useStoredToken } from '@/lib/authToken';
import type { Commande, Livreur, StatutCommande, Quartier } from '@/lib/types';

const STATUTS: StatutCommande[] = ['EN_ATTENTE', 'EN_COURS', 'LIVREE', 'ANNULEE', 'REJETEE', 'REPORTEE', 'INJOIGNABLE'];

export default function AdminCommandes() {
  const token = useStoredToken('admin_token');
  const [orders, setOrders] = useState<Commande[]>([]);
  const [drivers, setDrivers] = useState<Livreur[]>([]);
  const [quartiers, setQuartiers] = useState<Quartier[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const { toasts, showToast } = useToasts();

  const loadOrders = async () => {
    const params = new URLSearchParams();
    if (filterStatus) params.append('statut', filterStatus);
    if (filterDriver) params.append('livreurId', filterDriver);
    if (filterDate) params.append('date', filterDate);
    const queryString = params.toString();
    const path = queryString ? `/commandes?${queryString}` : '/commandes';

    try {
      const res = await apiFetch<Commande[]>(path, { token }).catch(() => []);
      setOrders(Array.isArray(res) ? res : []);
    } catch (err) {
      showToast('Erreur lors du chargement des commandes.', 'error');
    }
  };

  const loadDrivers = async () => {
    try {
      const res = await apiFetch<Livreur[]>('/auth/livreurs', { token }).catch(() => []);
      setDrivers(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error preloading drivers', err);
    }
  };

  const loadQuartiers = async () => {
    try {
      const res = await apiFetch<Quartier[]>('/quartiers').catch(() => []);
      setQuartiers(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error preloading quartiers', err);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadOrders();
    loadDrivers();
    loadQuartiers();

    const interval = setInterval(() => {
      loadOrders();
    }, 4000);

    return () => clearInterval(interval);
  }, [token, filterStatus, filterDriver, filterDate]);

  const handleAssignDriver = async (orderId: number, livreurIdVal: string) => {
    const livreurId = livreurIdVal ? parseInt(livreurIdVal) : null;
    try {
      await apiFetch(`/commandes/${orderId}/assign`, { method: 'PUT', token, body: { livreurId } });
      showToast('Livreur assigné avec succès.');
      loadOrders();
    } catch (err) {
      showToast("Erreur lors de l'assignation.", 'error');
    }
  };

  const handleQuartierUpdate = async (orderId: number, quartierIdVal: string) => {
    if (!quartierIdVal) return;
    try {
      await apiFetch(`/commandes/${orderId}/quartier`, { method: 'PUT', token, body: { quartierId: parseInt(quartierIdVal) } });
      showToast('Quartier mis à jour. Tarif recalculé.');
      loadOrders();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur modification quartier.', 'error');
    }
  };

  const handleStatusUpdate = async (orderId: number, statut: string) => {
    try {
      await apiFetch(`/commandes/${orderId}/status`, { method: 'PUT', token, body: { statut } });
      showToast(`Statut de la commande mis à jour : ${statut.replace('_', ' ')}`);
      loadOrders();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.', 'error');
    }
  };

  const handleWhatsAppNotify = async (orderId: number) => {
    try {
      const data = await apiFetch<{ link: string }>(`/commandes/${orderId}/whatsapp`, { token });
      window.open(data.link, '_blank');
    } catch (err) {
      showToast('Erreur lors de la génération du lien.', 'error');
    }
  };

  return (
    <div className="subtab-pane active">
      <div className="card glass-card table-card">
        <div className="table-actions" style={{ flexWrap: 'wrap', gap: '15px' }}>
          <h3>Liste Générale des Commandes</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div className="filter-group">
              <label><i className="fa-solid fa-calendar"></i> Date :</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFilterDate(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #334155)',
                  background: 'var(--bg-input, #0f172a)',
                  color: 'var(--text-color, #fff)'
                }}
              />
            </div>

            <div className="filter-group">
              <label><i className="fa-solid fa-truck"></i> Livreur :</label>
              <select value={filterDriver} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterDriver(e.target.value)}>
                <option value="">Tous les livreurs</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.prenom} {d.nom} (@{d.username})
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label><i className="fa-solid fa-filter"></i> Statut :</label>
              <select value={filterStatus} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}>
                <option value="">Tous les statuts</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="EN_COURS">En cours (En livraison)</option>
                <option value="LIVREE">Livrées</option>
                <option value="ANNULEE">Annulées</option>
                <option value="REJETEE">Rejetées</option>
                <option value="REPORTEE">Reportées</option>
                <option value="INJOIGNABLE">Injoignables</option>
              </select>
            </div>

            {(filterDate || filterDriver || filterStatus) && (
              <button
                className="btn btn-sm btn-outline"
                onClick={() => { setFilterDate(''); setFilterDriver(''); setFilterStatus(''); }}
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
              >
                <i className="fa-solid fa-rotate-left"></i> Réinitialiser
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Partenaire</th>
                <th>Destinataire & Tél.</th>
                <th>Quartier & Adresse</th>
                <th>Montant Total</th>
                <th>Date Création</th>
                <th>Livreur</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center' }}>Aucune commande trouvée.</td>
                </tr>
              ) : (
                orders.map(order => {
                  const formattedDate = new Date(order.dateCreation).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <tr key={order.id}>
                      <td><strong>#{order.id}</strong></td>
                      <td>{order.partenaireNom || <span className="text-muted">Particulier</span>}</td>
                      <td>
                        <strong>{order.nomClient}</strong><br />
                        <span className="text-muted"><i className="fa-solid fa-phone"></i> {order.telephoneClient}</span>
                        {order.descriptionArticle && (
                          <><br /><span className="text-muted" style={{ fontStyle: 'italic', fontSize: '11px' }}>Article : {order.descriptionArticle}</span></>
                        )}
                      </td>
                      <td>
                        <select
                          value={order.quartierId || ''}
                          onChange={(e) => handleQuartierUpdate(order.id, e.target.value)}
                          className="table-select"
                          style={{ fontWeight: 'bold' }}
                        >
                          <option value="">Spécifier Quartier</option>
                          {quartiers.map(q => (
                            <option key={q.id} value={q.id}>{q.nom}</option>
                          ))}
                        </select><br />
                        <span className="text-muted">{order.adressePrecise}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#16A34A', fontSize: '0.95rem' }}>
                          {(order.montantAEncaisser ?? order.montantTotal ?? 0).toLocaleString()} FCFA
                        </strong><br />
                        <span className="text-muted" style={{ fontSize: '11px' }}>
                          {order.livraisonGratuite ? (
                            <span style={{ color: '#16A34A', fontWeight: 'bold' }}>Livraison offerte (0 FCFA)</span>
                          ) : (
                            `Livraison: ${(order.tarifLivraisonEffective ?? order.tarifLivraison ?? 0).toLocaleString()} FCFA`
                          )}
                        </span>
                      </td>
                      <td>{formattedDate}</td>
                      <td>
                        <select
                          value={order.livreurId || ''}
                          onChange={(e) => handleAssignDriver(order.id, e.target.value)}
                          className="table-select"
                        >
                          <option value="">Non assigné</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>{d.prenom} {d.nom}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={order.statut}
                          onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                          className="table-select"
                        >
                          {STATUTS.map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                        {order.motifAnnulation && (
                          <div style={{ marginTop: '4px', fontSize: '11px', color: '#DC2626', fontStyle: 'italic', maxWidth: '160px' }}>
                            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '4px' }}></i>
                            Motif : {order.motifAnnulation}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button onClick={() => handleWhatsAppNotify(order.id)} className="btn btn-secondary btn-sm" title="Envoyer notification WhatsApp">
                            <i className="fa-brands fa-whatsapp" style={{ color: 'var(--color-success)', fontSize: '16px' }}></i> Notifier
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}
