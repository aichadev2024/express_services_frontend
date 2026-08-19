"use client";

import { useState, useEffect, useRef, useMemo, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import Header from '@/components/Header';
import { useToasts, ToastContainer } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import type { Produit, Quartier, Partenaire, Commande } from '@/lib/types';

export default function PublicLandingPage() {
  const { toasts, showToast } = useToasts();

  // Dropdown options loaded from backend
  const [products, setProducts] = useState<Produit[]>([]);
  const [quartiers, setQuartiers] = useState<Quartier[]>([]);
  const [partenaires, setPartenaires] = useState<Partenaire[]>([]);
  const [publicStats, setPublicStats] = useState<{
    colisLivres: number;
    livraisonsEnCours?: number;
    partenaires: number;
    satisfaction?: number;
  }>({
    colisLivres: 0,
    livraisonsEnCours: 0,
    partenaires: 0,
    satisfaction: 99.2
  });

  // Order Form State
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [selectedQuartierId, setSelectedQuartierId] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [addressPrecise, setAddressPrecise] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [descriptionArticle, setDescriptionArticle] = useState<string>('');
  const [orderLines, setOrderLines] = useState<Array<{ rowId: number; produitId: string; quantite: number }>>([
    { rowId: Date.now(), produitId: '', quantite: 1 }
  ]);

  // Search/Tracking State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [trackingOrders, setTrackingOrders] = useState<Commande[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Fetch initial data from backend APIs
  useEffect(() => {
    async function fetchData() {
      try {
        const [prodData, quartData, partData, statsData] = await Promise.all([
          apiFetch<Produit[]>('/produits?actifSeulement=true'),
          apiFetch<Quartier[]>('/quartiers'),
          apiFetch<Partenaire[]>('/partenaires'),
          apiFetch<{ colisLivres: number; partenaires: number }>('/commandes/public-stats')
        ]);
        setProducts(prodData);
        setQuartiers(quartData);
        setPartenaires(partData);
        setPublicStats(prev => ({ ...prev, ...statsData }));
      } catch (err) {
        showToast('Erreur lors de la connexion au serveur backend.', 'error');
      }
    }
    fetchData();
  }, []);

  // Real-time polling for public stats every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const statsData = await apiFetch<{ colisLivres: number; partenaires: number }>('/commandes/public-stats');
        setPublicStats(prev => ({ ...prev, ...statsData }));
      } catch (err) {
        console.error('Error polling public stats', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Leaflet Map on client-side
  useEffect(() => {
    if (typeof window !== 'undefined' && !mapRef.current && mapContainerRef.current) {
      const L = require('leaflet') as any;
      const defLat = 12.6392;
      const defLng = -8.0029;

      const map = L.map(mapContainerRef.current).setView([defLat, defLng], 12);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
        } else {
          markerRef.current = L.marker(e.latlng, { draggable: true }).addTo(map);
        }
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
      });
    }
  }, [mapContainerRef]);

  // Handle neighborhood select change to apply delivery fee
  const handleQuartierChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const qId = e.target.value;
    setSelectedQuartierId(qId);
    const quartier = quartiers.find(q => q.id === parseInt(qId));
    if (quartier) {
      setDeliveryFee(quartier.tarifLivraison);
    } else {
      setDeliveryFee(0);
    }
  };

  // Filter products by selected partner
  const filteredProducts = useMemo(() => {
    if (!selectedPartnerId) return [];
    return products.filter(p => p.partenaireId === parseInt(selectedPartnerId) || p.partenaire?.id === parseInt(selectedPartnerId));
  }, [products, selectedPartnerId]);

  // Add Product Line Row
  const addProductRow = () => {
    setOrderLines(prev => [...prev, { rowId: Date.now(), produitId: '', quantite: 1 }]);
  };

  // Remove Product Line Row
  const removeProductRow = (rowId: number) => {
    if (orderLines.length > 1) {
      setOrderLines(prev => prev.filter(line => line.rowId !== rowId));
    } else {
      showToast('Vous devez commander au moins 1 article.', 'error');
    }
  };

  // Update Specific Product Line
  const updateProductRow = (rowId: number, field: 'produitId' | 'quantite', value: string | number) => {
    setOrderLines(prev => prev.map(line => {
      if (line.rowId === rowId) {
        return { ...line, [field]: value };
      }
      return line;
    }));
  };

  // Compute subtotal, delivery, and total
  const itemsSubtotal = useMemo(() => {
    if (!selectedPartnerId) return 0;
    return orderLines.reduce((acc, line) => {
      const product = products.find(p => p.id === parseInt(line.produitId));
      if (product) {
        return acc + (product.prix * line.quantite);
      }
      return acc;
    }, 0);
  }, [orderLines, products, selectedPartnerId]);

  const grandTotal = itemsSubtotal + deliveryFee;

  // Handle Form Order Submission
  const handleOrderSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedQuartierId) {
      showToast('Veuillez sélectionner un quartier pour la livraison.', 'error');
      return;
    }

    let cleanLines = null;
    if (selectedPartnerId) {
      cleanLines = orderLines
        .filter(l => l.produitId !== '')
        .map(l => ({ produitId: parseInt(l.produitId), quantite: l.quantite }));

      if (cleanLines.length === 0) {
        showToast('Veuillez ajouter au moins un produit du partenaire.', 'error');
        return;
      }
    } else if (!descriptionArticle.trim()) {
      showToast("Veuillez renseigner une description de l'article à livrer.", 'error');
      return;
    }

    const payload = {
      nomClient: recipientName,
      telephoneClient: recipientPhone,
      emailClient: recipientEmail || null,
      quartierId: parseInt(selectedQuartierId),
      adressePrecise: addressPrecise,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      lignesProduits: cleanLines,
      partenaireId: selectedPartnerId ? parseInt(selectedPartnerId) : null,
      descriptionArticle: selectedPartnerId ? null : descriptionArticle
    };

    try {
      const data = await apiFetch<any>('/commandes', {
        method: 'POST',
        body: payload
      });

      showToast(`Commande #${data.id} soumise avec succès !`);

      // Reset state
      setSelectedPartnerId('');
      setRecipientName('');
      setRecipientPhone('');
      setRecipientEmail('');
      setSelectedQuartierId('');
      setDeliveryFee(0);
      setAddressPrecise('');
      setLatitude('');
      setLongitude('');
      setDescriptionArticle('');
      setOrderLines([{ rowId: Date.now(), produitId: '', quantite: 1 }]);

      const L = require('leaflet') as any;
      if (markerRef.current && mapRef.current) {
        mapRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }

      // Auto-search for the submitted order
      setSearchQuery(data.id.toString());
      runOrderSearch(data.id.toString());

      // Refresh products list to update stocks
      const prodData = await apiFetch<Produit[]>('/produits?actifSeulement=true');
      setProducts(prodData);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la création de la commande.', 'error');
    }
  };

  // Run Order Search (Tracking)
  const runOrderSearch = async (queryVal: string) => {
    if (!queryVal) return;
    setSearchLoading(true);
    try {
      const data = await apiFetch<Commande[]>(`/commandes/track?query=${encodeURIComponent(queryVal)}`);
      setTrackingOrders(data);
    } catch (err) {
      showToast('Erreur lors du suivi des colis.', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      showToast('Veuillez entrer un critère de recherche.', 'warning');
      return;
    }
    runOrderSearch(searchQuery);
  };

  return (
    <div className="app-container">
      {/* Header with admin login link */}
      <Header
        activeHref="/"
        statusBadge={
          <Link href="/admin" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            <i className="fa-solid fa-lock"></i> Espace Admin
          </Link>
        }
      />

      {/* Hero Vitrine Section */}
      <section className="hero-section" style={{ marginBottom: '80px' }}>
        <div className="hero-grid">
          <div className="hero-content">
            <span className="hero-badge">Express Services Mali</span>
            <h1>La logistique express de <span>confiance</span> au Mali</h1>
            <p>
              Découvrez la nouvelle génération de livraison urbaine à Bamako. Nous connectons particuliers et e-commerces avec nos livreurs professionnels pour un transport fiable, sécurisé et rapide.
            </p>
            <div className="hero-cta">
              <a href="#commande-section" className="btn btn-primary">
                <i className="fa-solid fa-paper-plane"></i> Envoyer un Colis
              </a>
              <Link href="/admin" className="btn btn-outline">
                <i className="fa-solid fa-user-shield"></i> Administration
              </Link>
            </div>
          </div>

          <div className="hero-visual" style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div className="feature-icon-wrapper" style={{ width: '50px', height: '50px', fontSize: '20px', background: 'rgba(255, 30, 39, 0.1)', color: 'var(--color-secondary)' }}>
                <i className="fa-solid fa-bolt"></i>
              </div>
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ margin: 0, fontWeight: 700 }}>Rapidité</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Livraison express garantie à Bamako.</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div className="feature-icon-wrapper" style={{ width: '50px', height: '50px', fontSize: '20px', background: 'rgba(255, 30, 39, 0.1)', color: 'var(--color-secondary)' }}>
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ margin: 0, fontWeight: 700 }}>Sécurité</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Suivi pas à pas et colis sécurisés.</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div className="feature-icon-wrapper" style={{ width: '50px', height: '50px', fontSize: '20px', background: 'rgba(255, 30, 39, 0.1)', color: 'var(--color-secondary)' }}>
                <i className="fa-solid fa-headset"></i>
              </div>
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ margin: 0, fontWeight: 700 }}>Assistance</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Support client disponible 6j/7.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chiffres Clés Section */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">
              {publicStats.colisLivres.toLocaleString()}
            </span>
            <span className="stat-label">Colis Livrés</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {(publicStats.livraisonsEnCours ?? 0).toLocaleString()}
            </span>
            <span className="stat-label">Livraisons En Cours</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {(publicStats.satisfaction ?? 99.2).toFixed(1)}%
            </span>
            <span className="stat-label">Satisfaction Client</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {publicStats.partenaires}
            </span>
            <span className="stat-label">E-commerces Partenaires</span>
          </div>
        </div>
      </section>

      {/* Core Client & Partner Portal */}
      <main className="main-content" id="commande-section" style={{ scrollMarginTop: '80px', marginBottom: '85px' }}>
        <div className="portal-grid">
          {/* Order Placement Form */}
          <div className="portal-left-column card glass-card">
            <div className="card-header">
              <div className="card-icon"><i className="fa-solid fa-paper-plane"></i></div>
              <h2>Formulaire de Livraison</h2>
            </div>
            <p className="card-subtitle">
              Saisissez les coordonnées du destinataire et le quartier de Bamako pour soumettre une course.
            </p>

            <form onSubmit={handleOrderSubmit} className="form-grid">
              {/* Partner selection */}
              <div className="form-group full-width">
                <label><i className="fa-solid fa-handshake"></i> Commande émise par un Partenaire E-commerce ?</label>
                <select value={selectedPartnerId} onChange={(e) => {
                  setSelectedPartnerId(e.target.value);
                  setOrderLines([{ rowId: Date.now(), produitId: '', quantite: 1 }]);
                }}>
                  <option value="">Non, expédition particulière (Particulier)</option>
                  {partenaires.map(p => (
                    <option key={p.id} value={p.id}>{p.nom} - Boutique</option>
                  ))}
                </select>
              </div>

              {/* Client Info */}
              <div className="form-group">
                <label><i className="fa-solid fa-user"></i> Destinataire</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  required
                  placeholder="Nom complet"
                />
              </div>
              <div className="form-group">
                <label><i className="fa-solid fa-phone"></i> Téléphone</label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  required
                  placeholder="Ex: 76000000"
                />
              </div>
              <div className="form-group full-width">
                <label><i className="fa-solid fa-envelope"></i> E-mail du Destinataire (Optionnel)</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="destinataire@example.com"
                />
              </div>

              {/* Conditional Particular vs Partner fields */}
              {!selectedPartnerId ? (
                <div className="form-group full-width">
                  <label><i className="fa-solid fa-box-open"></i> Description de l'article à livrer</label>
                  <textarea
                    value={descriptionArticle}
                    onChange={(e) => setDescriptionArticle(e.target.value)}
                    placeholder="Ex: Un sachet contenant des vêtements, un pli de documents..."
                    rows={3}
                  />
                </div>
              ) : (
                <div className="form-group full-width products-section">
                  <label><i className="fa-solid fa-warehouse"></i> Articles Commandés dans votre Boutique</label>
                  {orderLines.map((line, idx) => (
                    <div key={line.rowId} className="product-row">
                      <select
                        value={line.produitId}
                        onChange={(e) => updateProductRow(line.rowId, 'produitId', e.target.value)}
                        required
                      >
                        <option value="">Sélectionner un produit...</option>
                        {filteredProducts.map(p => {
                          const currentStock = p.quantiteStock ?? p.stock;
                          return (
                            <option key={p.id} value={p.id} disabled={currentStock <= 0}>
                              {p.nom} ({p.prix.toLocaleString()} FCFA) - {currentStock > 0 ? `Stock: ${currentStock}` : 'Rupture'}
                            </option>
                          );
                        })}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={line.quantite}
                        onChange={(e) => updateProductRow(line.rowId, 'quantite', parseInt(e.target.value) || 1)}
                        required
                      />
                      <button
                        type="button"
                        className="btn-remove-row"
                        onClick={() => removeProductRow(line.rowId)}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addProductRow} style={{ marginTop: '10px' }}>
                    <i className="fa-solid fa-plus"></i> Ajouter un article
                  </button>
                </div>
              )}

              {/* Delivery Destination */}
              <div className="form-group">
                <label><i className="fa-solid fa-map-location-dot"></i> Quartier de Bamako</label>
                <select value={selectedQuartierId} onChange={handleQuartierChange} required>
                  <option value="">Sélectionner le quartier...</option>
                  {quartiers.map(q => (
                    <option key={q.id} value={q.id}>{q.nom} ({q.tarifLivraison.toLocaleString()} FCFA)</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label><i className="fa-solid fa-wallet"></i> Frais de livraison</label>
                <input
                  type="text"
                  value={`${deliveryFee.toLocaleString()} FCFA`}
                  className="readonly-input"
                  readOnly
                />
              </div>

              <div className="form-group full-width">
                <label><i className="fa-solid fa-map-pin"></i> Adresse précise de livraison</label>
                <input
                  type="text"
                  value={addressPrecise}
                  onChange={(e) => setAddressPrecise(e.target.value)}
                  required
                  placeholder="Ex: Rue 14, Porte 250, à côté de la pharmacie"
                />
              </div>

              {/* Leaflet GPS Mapping */}
              <div className="form-group full-width">
                <label><i className="fa-solid fa-earth-africa"></i> Position GPS du destinataire (Optionnel)</label>
                <div ref={mapContainerRef} className="mini-map"></div>
                <span className="map-help">Cliquez sur la carte pour définir précisément le point de livraison</span>
              </div>

              {/* Order Summary box */}
              <div className="form-group full-width order-summary-box">
                {selectedPartnerId && (
                  <div className="summary-line">
                    <span>Sous-total articles :</span>
                    <span>{itemsSubtotal.toLocaleString()} FCFA</span>
                  </div>
                )}
                <div className="summary-line">
                  <span>Frais de livraison :</span>
                  <span>{deliveryFee.toLocaleString()} FCFA</span>
                </div>
                <div className="summary-line total-line">
                  <span>Total à collecter :</span>
                  <span>{grandTotal.toLocaleString()} FCFA</span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary full-width submit-btn">
                <i className="fa-solid fa-paper-plane"></i> Soumettre la Commande
              </button>
            </form>
          </div>

          {/* Tracking Panel */}
          <div className="portal-right-column" id="suivi-section" style={{ scrollMarginTop: '80px' }}>
            <div className="card glass-card">
              <div className="card-header">
                <div className="card-icon"><i className="fa-solid fa-magnifying-glass"></i></div>
                <h2>Suivi en Direct de vos Colis</h2>
              </div>
              <p className="card-subtitle">
                Entrez le numéro du destinataire, le nom du partenaire ou l'ID de commande pour suivre le statut.
              </p>

              <form onSubmit={handleSearchSubmit} className="search-box-container">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: Boutique Parisienne, 76000000, ID..."
                />
                <button type="submit" className="btn btn-primary">
                  <i className="fa-solid fa-search"></i> Rechercher
                </button>
              </form>

              <div className="tracking-results">
                {searchLoading ? (
                  <div className="empty-state">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <p>Recherche en cours...</p>
                  </div>
                ) : trackingOrders.length === 0 ? (
                  <div className="empty-state">
                    <i className="fa-solid fa-box-open"></i>
                    <p>Aucun résultat à afficher. Entrez un critère pour lancer le suivi.</p>
                  </div>
                ) : (
                  trackingOrders.map(order => {
                    const formattedDate = new Date(order.dateCreation).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    });

                    const status = order.statut;
                    const steps = ['EN_ATTENTE', 'EN_COURS', 'LIVREE'];
                    const activeIndex = steps.indexOf(status);

                    return (
                      <div key={order.id} className="order-card" style={{ marginBottom: '15px' }}>
                        <div className="order-card-header">
                          <div>
                            <span className="order-id">Commande #{order.id}</span>
                            <div className="order-date">{formattedDate}</div>
                          </div>
                          <span className={`badge ${order.statut.toLowerCase()}`}>{order.statut.replace('_', ' ')}</span>
                        </div>

                        <div className="order-card-body">
                          <div className="order-detail-row">
                            <span className="order-detail-label">Destinataire :</span>
                            <span className="order-detail-val">{order.nomClient}</span>
                          </div>
                          <div className="order-detail-row">
                            <span className="order-detail-label">Lieu :</span>
                            <span className="order-detail-val">{order.quartierNom} - {order.adressePrecise}</span>
                          </div>
                          {order.descriptionArticle && (
                            <div className="order-detail-row">
                              <span className="order-detail-label">Description :</span>
                              <span className="order-detail-val">{order.descriptionArticle}</span>
                            </div>
                          )}
                          {order.lignesProduits && order.lignesProduits.length > 0 && (
                            <div className="order-products-list">
                              {order.lignesProduits.map((l, index) => (
                                <div key={index} className="order-product-item">
                                  <span>{l.produitNom} (x{l.quantite})</span>
                                  <span>{l.sousTotal.toLocaleString()} FCFA</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="order-detail-row" style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', marginTop: '5px' }}>
                            <span className="order-detail-label" style={{ fontWeight: 700 }}>Montant Total :</span>
                            <span className="order-detail-val" style={{ color: 'var(--color-secondary)', fontWeight: 700 }}>
                              {order.montantTotal.toLocaleString()} FCFA
                            </span>
                          </div>
                        </div>

                        <div className="order-progress">
                          {status === 'ANNULEE' || status === 'REJETEE' ? (
                            <div className="progress-step active" style={{ color: 'var(--color-danger)' }}>
                              <div className="progress-icon" style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}></div>
                              <span>Annulée / Rejetée</span>
                            </div>
                          ) : status === 'REPORTEE' || status === 'INJOIGNABLE' ? (
                            <div className="progress-step active" style={{ color: 'var(--color-purple)' }}>
                              <div className="progress-icon" style={{ backgroundColor: 'var(--color-purple)', borderColor: 'var(--color-purple)' }}></div>
                              <span>{status === 'REPORTEE' ? 'Reportée' : 'Injoignable'}</span>
                            </div>
                          ) : (
                            <>
                              <div className={`progress-step ${activeIndex >= 0 ? (activeIndex === 0 ? 'active' : 'completed') : ''}`}>
                                <div className="progress-icon"></div>
                                <span>Reçue</span>
                              </div>
                              <div className={`progress-step ${activeIndex >= 1 ? (activeIndex === 1 ? 'active' : 'completed') : ''}`}>
                                <div className="progress-icon"></div>
                                <span>En Route</span>
                              </div>
                              <div className={`progress-step ${activeIndex >= 2 ? 'active completed' : ''}`}>
                                <div className="progress-icon"></div>
                                <span>Livrée</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo-area" style={{ padding: 0 }}>
              <div className="logo-icon-container" style={{ width: '40px', height: '40px' }}>
                <img src="/logo.svg" alt="Express Services Logo" className="logo-svg" />
              </div>
              <div className="logo-text">
                <span className="logo-title" style={{ color: '#ffffff' }}>
                  <span className="logo-red-accent">E</span>XPRESS
                </span>
                <span className="logo-subtitle" style={{ color: 'rgba(255,255,255,0.7)' }}>SERVICES</span>
              </div>
            </div>
            <p>
              Votre partenaire de transport et de livraison rapide au Mali. Fiabilité, rapidité et transparence à chaque colis.
            </p>
          </div>
          <div className="footer-links-col">
            <h4>Nos Services</h4>
            <ul>
              <li><a href="#commande-section">Créer une Livraison</a></li>
              <li><a href="#suivi-section">Suivi de Colis</a></li>
            </ul>
          </div>
          <div className="footer-links-col">
            <h4>Contact & Horaires</h4>
            <ul>
              <li><span style={{ color: 'rgba(255,255,255,0.7)' }}>Bamako, Mali</span></li>
              <li><span style={{ color: 'rgba(255,255,255,0.7)' }}>Lundi - Samedi : 8h - 19h</span></li>
              <li><span style={{ color: 'rgba(255,255,255,0.7)' }}>Tél : +223 76 00 00 00</span></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Express Services. Tous droits réservés.</span>
          <Link href="/admin" className="footer-gateway-link">
            <i className="fa-solid fa-user-shield"></i> Portail Administration
          </Link>
          <span>Logistique Express au Mali</span>
        </div>
      </footer>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
