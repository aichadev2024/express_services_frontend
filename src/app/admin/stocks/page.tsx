"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { useToasts, ToastContainer } from '@/components/Toast';
import { useStoredToken } from '@/lib/authToken';
import type { Produit, ProduitStockStats, Partenaire } from '@/lib/types';

export default function AdminStocks() {
  const token = useStoredToken('admin_token');
  const [stocks, setStocks] = useState<ProduitStockStats[]>([]);
  const [allProducts, setAllProducts] = useState<Produit[]>([]);
  const [partenaires, setPartenaires] = useState<Partenaire[]>([]);
  const { toasts, showToast } = useToasts();

  // Product Form State
  const [productId, setProductId] = useState('');
  const [productNom, setProductNom] = useState('');
  const [productPrix, setProductPrix] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productActif, setProductActif] = useState(true);
  const [productPartenaireId, setProductPartenaireId] = useState('');

  const loadStocks = async () => {
    if (!token) return;
    try {
      const [statsData, prodData] = await Promise.all([
        apiFetch<ProduitStockStats[]>('/produits/stats', { token }).catch(() => []),
        apiFetch<Produit[]>('/produits?actifSeulement=false').catch(() => []),
      ]);
      setStocks(Array.isArray(statsData) ? statsData : []);
      setAllProducts(Array.isArray(prodData) ? prodData : []);
    } catch (err) {
      showToast('Erreur lors du chargement des stocks.', 'error');
    }
  };

  const loadPartenaires = async () => {
    try {
      const data = await apiFetch<Partenaire[]>('/partenaires').catch(() => []);
      setPartenaires(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading partenaires', err);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadStocks();
    loadPartenaires();
  }, [token]);

  const handleEditProductClick = async (prod: { id: number }) => {
    try {
      const data = await apiFetch<Produit>(`/produits/${prod.id}`, { token });
      if (data) {
        setProductId(String(data.id));
        setProductNom(data.nom || '');
        setProductPrix(String(data.prix ?? 0));
        setProductStock(String(data.stock ?? 0));
        setProductDesc(data.description || '');
        setProductActif(data.actif ?? true);
        setProductPartenaireId(data.partenaireId ? String(data.partenaireId) : '');
      }
    } catch (err) {
      showToast('Impossible de charger les détails du produit.', 'error');
    }
  };

  const handleProductFormCancel = () => {
    setProductId('');
    setProductNom('');
    setProductPrix('');
    setProductStock('');
    setProductDesc('');
    setProductActif(true);
    setProductPartenaireId('');
  };

  const handleProductSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = {
      nom: productNom,
      prix: parseFloat(productPrix),
      stock: parseInt(productStock),
      description: productDesc,
      actif: productActif,
      partenaireId: productPartenaireId ? parseInt(productPartenaireId) : null,
    };

    try {
      await apiFetch(productId ? `/produits/${productId}` : '/produits', {
        method: productId ? 'PUT' : 'POST',
        token,
        body: payload,
      });
      showToast(productId ? 'Produit mis à jour avec succès.' : 'Nouveau produit créé.');
      handleProductFormCancel();
      loadStocks();
    } catch (err) {
      showToast('Erreur lors de la sauvegarde du produit.', 'error');
    }
  };

  const safeStocks = Array.isArray(stocks) ? stocks : [];
  const safeAllProducts = Array.isArray(allProducts) ? allProducts : [];
  const safePartenaires = Array.isArray(partenaires) ? partenaires : [];

  return (
    <div className="subtab-pane active">
      <div className="stock-grid">

        {/* Left Inventory Table */}
        <div className="card glass-card table-card">
          <div className="card-header">
            <div className="card-icon"><i className="fa-solid fa-boxes-stacked"></i></div>
            <h2>Inventaire & Statistiques des Stocks</h2>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Partenaire</th>
                  <th>Disponible</th>
                  <th>En livraison</th>
                  <th>Retournés</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {safeStocks.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center' }}>Aucun produit trouvé.</td>
                  </tr>
                ) : (
                  safeStocks.map(s => {
                    const fullProduct = safeAllProducts.find(p => p.id === s.id);
                    const stockDispo = s.stockDisponible ?? 0;
                    return (
                      <tr key={s.id}>
                        <td><strong>{s.nom || 'Sans nom'}</strong></td>
                        <td>{fullProduct?.partenaireNom || <span className="text-muted">—</span>}</td>
                        <td><span className={`badge ${stockDispo > 5 ? 'livree' : 'annulee'}`}>{stockDispo} en stock</span></td>
                        <td><span className="badge en_cours">{s.sortisPourLivraison ?? 0} sortis</span></td>
                        <td><span className="badge reportee">{s.retournes ?? 0} retournés</span></td>
                        <td>
                          <button onClick={() => handleEditProductClick(s)} className="btn btn-secondary btn-sm">
                            <i className="fa-solid fa-pen-to-square"></i> Modifier / Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Product Controls Form */}
        <div className="card glass-card stock-control-card">
          <div className="card-header">
            <div className="card-icon"><i className="fa-solid fa-sliders"></i></div>
            <h2>{productId ? 'Modifier le Produit / Réapprovisionner' : 'Créer un Produit'}</h2>
          </div>
          <form onSubmit={handleProductSubmit} className="form-grid">
            <div className="form-group full-width">
              <label>Nom du Produit</label>
              <input
                type="text"
                value={productNom}
                onChange={(e) => setProductNom(e.target.value)}
                required
                placeholder="Ex: Sac de riz 25kg"
              />
            </div>

            <div className="form-group">
              <label>Prix Unitaire (FCFA)</label>
              <input
                type="number"
                value={productPrix}
                onChange={(e) => setProductPrix(e.target.value)}
                required
                min="0"
                placeholder="15000"
              />
            </div>

            <div className="form-group">
              <label>Stock Total en Dépôt</label>
              <input
                type="number"
                value={productStock}
                onChange={(e) => setProductStock(e.target.value)}
                required
                min="0"
                placeholder="50"
              />
            </div>

            <div className="form-group full-width">
              <label>Description</label>
              <textarea
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
                rows={3}
                placeholder="Description du produit..."
              ></textarea>
            </div>

            <div className="form-group full-width">
              <label>Partenaire propriétaire (optionnel)</label>
              <select value={productPartenaireId} onChange={(e) => setProductPartenaireId(e.target.value)}>
                <option value="">Aucun (catalogue général)</option>
                {safePartenaires.map(p => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>

            <div className="form-group full-width toggle-group">
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={productActif}
                  onChange={(e) => setProductActif(e.target.checked)}
                />
                Produit Actif (visible par les partenaires)
              </label>
            </div>

            <div className="form-actions full-width" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={handleProductFormCancel} className="btn btn-secondary">Annuler</button>
              <button type="submit" className="btn btn-primary"><i className="fa-solid fa-save"></i> Enregistrer</button>
            </div>
          </form>
        </div>

      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}
