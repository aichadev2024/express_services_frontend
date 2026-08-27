"use client";

import { useState, useEffect, useRef, useMemo, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import Header from '@/components/Header';
import PhoneInput from '@/components/PhoneInput';
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
  
  // Custom Detailed Form State
  const [userProfileType, setUserProfileType] = useState<'e-commercant' | 'particulier'>('e-commercant');
  const [referenceCommande] = useState<string>(() => `EXP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [produitArticle, setProduitArticle] = useState<string>('');
  const [quantiteCmd, setQuantiteCmd] = useState<number>(1);
  const [montantCmd, setMontantCmd] = useState<string>('');
  const [modePaiement, setModePaiement] = useState<'livraison' | 'deja_paye'>('livraison');
  const [isFragile, setIsFragile] = useState<boolean>(false);
  const [expediteurNom, setExpediteurNom] = useState<string>('');
  const [expediteurTel, setExpediteurTel] = useState<string>('');
  const [expediteurAdresse, setExpediteurAdresse] = useState<string>('');
  const [expediteurQuartier, setExpediteurQuartier] = useState<string>('');
  const [instructionsLivreur, setInstructionsLivreur] = useState<string>('');
  const [valeurColis, setValeurColis] = useState<string>('');
  const [particulierMode, setParticulierMode] = useState<'envoi' | 'recuperation'>('envoi');

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
    let computedDescription = '';

    if (userProfileType === 'e-commercant') {
      const qSelected = quartiers.find(q => q.id === parseInt(selectedQuartierId));
      const qTarif = qSelected ? qSelected.tarifLivraison : 0;
      const mCmd = parseFloat(montantCmd) || 0;
      const totalEncaisser = modePaiement === 'livraison' ? (mCmd + qTarif) : qTarif;

      computedDescription = 
        `📌 RÉFÉRENCE: ${referenceCommande}\n` +
        `📦 PRODUIT: ${produitArticle || 'Non spécifié'} (Qté: ${quantiteCmd})\n` +
        `💰 MONTANT COMMANDE: ${mCmd.toLocaleString()} FCFA\n` +
        `💳 MODE PAIEMENT: ${modePaiement === 'livraison' ? '💵 Paiement à la livraison' : '✅ Déjà payé'}\n` +
        `⚠️ FRAGILE: ${isFragile ? 'OUI 🍷' : 'NON 📦'}\n` +
        `📍 RAMASSAGE BOUTIQUE: ${expediteurNom} (Tél: ${expediteurTel}) - ${expediteurAdresse}\n` +
        `📝 INSTRUCTIONS LIVREUR: ${instructionsLivreur || 'Aucune'}\n` +
        `💵 TOTAL À ENCAISSER: ${totalEncaisser.toLocaleString()} FCFA`;
    } else {
      const isEnvoi = particulierMode === 'envoi';
      const valColis = parseFloat(valeurColis) || 0;
      computedDescription = 
        `[MODE: ${isEnvoi ? 'ENVOI DE COLIS' : 'RÉCUPÉRATION DE COLIS'}]\n` +
        `📦 CONTENU: ${descriptionArticle}\n` +
        `💰 VALEUR ESTIMÉE: ${valColis.toLocaleString()} FCFA\n` +
        `📍 POINT DE RÉCUPÉRATION: ${expediteurNom} (Tél: ${expediteurTel}) - Quartier: ${expediteurQuartier} - Adresse: ${expediteurAdresse}\n` +
        `📝 INSTRUCTIONS PARTICULIÈRES: ${instructionsLivreur || 'Aucune'}`;
    }

    const includeFrictionless = userProfileType === 'e-commercant' || (userProfileType === 'particulier' && particulierMode === 'recuperation');

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
      descriptionArticle: computedDescription,
      nomExpediteur: includeFrictionless && expediteurNom ? expediteurNom.trim() : null,
      telephoneExpediteur: includeFrictionless && expediteurTel ? expediteurTel.trim() : null,
      adresseExpediteur: includeFrictionless && expediteurAdresse ? expediteurAdresse.trim() : null
    };

    try {
      const data = await apiFetch<any>('/commandes', {
        method: 'POST',
        body: payload
      });

      showToast(`Commande #${data.id} créée avec succès !`);

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
      setProduitArticle('');
      setQuantiteCmd(1);
      setMontantCmd('');
      setExpediteurNom('');
      setExpediteurTel('');
      setExpediteurAdresse('');
      setExpediteurQuartier('');
      setInstructionsLivreur('');
      setValeurColis('');
      setOrderLines([{ rowId: Date.now(), produitId: '', quantite: 1 }]);

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
            <h1>La logistique des <span>E-commerçants</span> à Bamako</h1>
            <p>
              Confiez-nous vos livraisons et concentrez-vous sur vos ventes. EXPRESS SERVICES prend en charge vos commandes, vos colis et leur livraison jusqu’au client.
            </p>
            <div className="hero-cta">
              <a href="#commande-section" className="btn btn-primary">
                <i className="fa-solid fa-paper-plane"></i> Demander une Livraison
              </a>
              <Link href="/admin" className="btn btn-outline">
                <i className="fa-solid fa-user-shield"></i> Administration
              </Link>
            </div>
          </div>

          <div className="hero-visual" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="feature-icon-wrapper" style={{ width: '40px', height: '40px', fontSize: '18px', background: 'rgba(255, 30, 39, 0.1)', color: 'var(--color-secondary)' }}>
                <i className="fa-solid fa-boxes-stacked"></i>
              </div>
              <h4 style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>Gestion des commandes</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Centralisez vos livraisons</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="feature-icon-wrapper" style={{ width: '40px', height: '40px', fontSize: '18px', background: 'rgba(255, 30, 39, 0.1)', color: 'var(--color-secondary)' }}>
                <i className="fa-solid fa-truck-fast"></i>
              </div>
              <h4 style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>Livraison</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Vos commandes livrées à vos clients</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="feature-icon-wrapper" style={{ width: '40px', height: '40px', fontSize: '18px', background: 'rgba(255, 30, 39, 0.1)', color: 'var(--color-secondary)' }}>
                <i className="fa-solid fa-money-bill-wave"></i>
              </div>
              <h4 style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>Encaissement</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Suivez les paiements à la livraison</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="feature-icon-wrapper" style={{ width: '40px', height: '40px', fontSize: '18px', background: 'rgba(255, 30, 39, 0.1)', color: 'var(--color-secondary)' }}>
                <i className="fa-solid fa-chart-pie"></i>
              </div>
              <h4 style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>📊 Suivi</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Pilotez votre activité en temps réel</p>
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
              <h2>Que souhaitez-vous faire ?</h2>
            </div>

            {/* Profile Selection Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div
                onClick={() => setUserProfileType('e-commercant')}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: `2px solid ${userProfileType === 'e-commercant' ? 'var(--color-primary)' : '#e2e8f0'}`,
                  background: userProfileType === 'e-commercant' ? 'rgba(13, 33, 73, 0.04)' : '#fff',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-navy)', marginBottom: '4px' }}>
                  <i className="fa-solid fa-store" style={{ color: 'var(--color-secondary)', marginRight: '6px' }}></i>
                  Je suis e-commerçant
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Je veux faire livrer une commande à mon client.
                </div>
              </div>

              <div
                onClick={() => setUserProfileType('particulier')}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: `2px solid ${userProfileType === 'particulier' ? 'var(--color-primary)' : '#e2e8f0'}`,
                  background: userProfileType === 'particulier' ? 'rgba(13, 33, 73, 0.04)' : '#fff',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-navy)', marginBottom: '4px' }}>
                  <i className="fa-solid fa-user" style={{ color: 'var(--color-secondary)', marginRight: '6px' }}></i>
                  Je suis un particulier
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Je veux envoyer ou faire récupérer un colis.
                </div>
              </div>
            </div>

            {/* Type de demande Selector */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 700, fontSize: '13px', color: '#475569', display: 'block', marginBottom: '8px' }}>
                Type de demande
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => setUserProfileType('e-commercant')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: userProfileType === 'e-commercant' ? 'var(--color-secondary)' : 'transparent',
                    color: userProfileType === 'e-commercant' ? '#fff' : '#64748b',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  <div>1- Nouvelle commande</div>
                  <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 400 }}>Pour les e-commerçants</div>
                </button>

                <button
                  type="button"
                  onClick={() => setUserProfileType('particulier')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: userProfileType === 'particulier' ? 'var(--color-secondary)' : 'transparent',
                    color: userProfileType === 'particulier' ? '#fff' : '#64748b',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  <div>2- Envoyer / Récupérer</div>
                  <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 400 }}>Pour les particuliers</div>
                </button>
              </div>
            </div>

            <form onSubmit={handleOrderSubmit} className="form-grid">
              {/* E-COMMERÇANT FORM */}
              {userProfileType === 'e-commercant' ? (
                <>
                  <div className="form-group full-width">
                    <label style={{ fontWeight: 700, color: 'var(--color-primary)' }}><i className="fa-solid fa-file-invoice"></i> Informations sur la commande</label>
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-barcode"></i> Référence commande (auto)</label>
                    <input type="text" value={referenceCommande} readOnly style={{ background: '#f1f5f9', fontWeight: 'bold' }} />
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-box"></i> Produit / article</label>
                    <input type="text" value={produitArticle} onChange={(e) => setProduitArticle(e.target.value)} required placeholder="Ex: Robe Wax, Chaussures" />
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-arrow-down-1-9"></i> Quantité</label>
                    <input type="number" min="1" value={quantiteCmd} onChange={(e) => setQuantiteCmd(parseInt(e.target.value) || 1)} required />
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-money-bill-wave"></i> Montant commande (FCFA)</label>
                    <input type="number" value={montantCmd} onChange={(e) => setMontantCmd(e.target.value)} required placeholder="Ex: 20000" />
                  </div>
                  <div className="form-group full-width">
                    <label><i className="fa-solid fa-credit-card"></i> Mode de paiement</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setModePaiement('livraison')}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: `2px solid ${modePaiement === 'livraison' ? 'var(--color-primary)' : '#cbd5e1'}`,
                          background: modePaiement === 'livraison' ? 'rgba(13,33,73,0.08)' : '#fff',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        💵 Paiement à la livraison
                      </button>
                      <button
                        type="button"
                        onClick={() => setModePaiement('deja_paye')}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: `2px solid ${modePaiement === 'deja_paye' ? '#10b981' : '#cbd5e1'}`,
                          background: modePaiement === 'deja_paye' ? 'rgba(16,185,129,0.08)' : '#fff',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✅ Déjà payé
                      </button>
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label style={{ fontWeight: 700, color: 'var(--color-primary)' }}><i className="fa-solid fa-store"></i> 📍 Récupération du colis</label>
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-user"></i> Nom commerçant / boutique</label>
                    <input type="text" value={expediteurNom} onChange={(e) => setExpediteurNom(e.target.value)} required placeholder="Ex: Mali Fashion" />
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-phone"></i> Téléphone commerçant</label>
                    <PhoneInput value={expediteurTel} onChange={setExpediteurTel} required placeholder="70 00 00 00" />
                  </div>
                  <div className="form-group full-width">
                    <label><i className="fa-solid fa-location-dot"></i> Adresse de récupération</label>
                    <input type="text" value={expediteurAdresse} onChange={(e) => setExpediteurAdresse(e.target.value)} required placeholder="Ex: Grand Marché, Allée 3, Boutique 12" />
                  </div>

                  <div className="form-group full-width">
                    <label style={{ fontWeight: 700, color: 'var(--color-primary)' }}><i className="fa-solid fa-bullseye"></i> 🎯 Livraison au client</label>
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-user"></i> Nom du client</label>
                    <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} required placeholder="Nom du client" />
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-phone"></i> Téléphone client</label>
                    <PhoneInput value={recipientPhone} onChange={setRecipientPhone} required placeholder="70 00 00 00" />
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-map-location-dot"></i> Quartier du client</label>
                    <select value={selectedQuartierId} onChange={handleQuartierChange} required>
                      <option value="">Sélectionner le quartier...</option>
                      {quartiers.map(q => (
                        <option key={q.id} value={q.id}>{q.nom} ({q.tarifLivraison.toLocaleString()} FCFA)</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-map-pin"></i> Adresse précise client</label>
                    <input type="text" value={addressPrecise} onChange={(e) => setAddressPrecise(e.target.value)} required placeholder="Rue, porte, repère..." />
                  </div>
                  <div className="form-group full-width">
                    <label><i className="fa-solid fa-comment-dots"></i> Instruction pour le livreur (facultatif)</label>
                    <input type="text" value={instructionsLivreur} onChange={(e) => setInstructionsLivreur(e.target.value)} placeholder="Ex: Appeler avant de venir" />
                  </div>

                  <div className="form-group full-width">
                    <label style={{ fontWeight: 700, color: 'var(--color-primary)' }}><i className="fa-solid fa-circle-info"></i> 📦 Informations complémentaires</label>
                  </div>
                  <div className="form-group full-width">
                    <label>Description du colis</label>
                    <textarea value={descriptionArticle} onChange={(e) => setDescriptionArticle(e.target.value)} rows={2} placeholder="Précisions sur l'emballage..." />
                  </div>
                  <div className="form-group full-width" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <label style={{ marginBottom: 0 }}>Fragile ?</label>
                    <button
                      type="button"
                      onClick={() => setIsFragile(!isFragile)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: 'none',
                        background: isFragile ? '#f59e0b' : '#cbd5e1',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isFragile ? 'OUI 🍷' : 'NON 📦'}
                    </button>
                  </div>
                </>
              ) : (
                /* PARTICULIER FORM */
                <>
                  <div className="form-group full-width">
                    <label style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Que souhaitez-vous faire ?</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setParticulierMode('envoi')}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: `2px solid ${particulierMode === 'envoi' ? 'var(--color-primary)' : '#cbd5e1'}`,
                          background: particulierMode === 'envoi' ? 'rgba(13,33,73,0.08)' : '#fff',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Envoyer un colis
                      </button>
                      <button
                        type="button"
                        onClick={() => setParticulierMode('recuperation')}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: `2px solid ${particulierMode === 'recuperation' ? 'var(--color-primary)' : '#cbd5e1'}`,
                          background: particulierMode === 'recuperation' ? 'rgba(13,33,73,0.08)' : '#fff',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Faire récupérer un colis
                      </button>
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label style={{ fontWeight: 700, color: 'var(--color-primary)' }}>📍 Point de Récupération</label>
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-user"></i> {particulierMode === 'envoi' ? 'Votre nom' : 'Nom de l\'expéditeur'}</label>
                    <input type="text" value={expediteurNom} onChange={(e) => setExpediteurNom(e.target.value)} required placeholder="Nom complet" />
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-phone"></i> Téléphone</label>
                    <PhoneInput value={expediteurTel} onChange={setExpediteurTel} required placeholder="70 00 00 00" />
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-map-location"></i> Quartier</label>
                    <input type="text" value={expediteurQuartier} onChange={(e) => setExpediteurQuartier(e.target.value)} placeholder="Ex: Badalabougou" />
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-house"></i> Adresse précise</label>
                    <input type="text" value={expediteurAdresse} onChange={(e) => setExpediteurAdresse(e.target.value)} required placeholder="Adresse précise" />
                  </div>

                  <div className="form-group full-width">
                    <label style={{ fontWeight: 700, color: 'var(--color-primary)' }}>🎯 Destinataire</label>
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-user"></i> Nom du destinataire</label>
                    <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} required placeholder="Nom du destinataire" />
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-phone"></i> Téléphone destinataire</label>
                    <PhoneInput value={recipientPhone} onChange={setRecipientPhone} required placeholder="70 00 00 00" />
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-map-location-dot"></i> Quartier de livraison</label>
                    <select value={selectedQuartierId} onChange={handleQuartierChange} required>
                      <option value="">Sélectionner le quartier...</option>
                      {quartiers.map(q => (
                        <option key={q.id} value={q.id}>{q.nom} ({q.tarifLivraison.toLocaleString()} FCFA)</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label><i className="fa-solid fa-map-pin"></i> Adresse précise destinataire</label>
                    <input type="text" value={addressPrecise} onChange={(e) => setAddressPrecise(e.target.value)} required placeholder="Rue, porte, repère..." />
                  </div>

                  <div className="form-group full-width">
                    <label style={{ fontWeight: 700, color: 'var(--color-primary)' }}>📦 Votre colis</label>
                  </div>
                  <div className="form-group full-width">
                    <label>Que contient le colis ?</label>
                    <textarea value={descriptionArticle} onChange={(e) => setDescriptionArticle(e.target.value)} required rows={2} placeholder="Ex: Clés de maison, Chaussures, Pli..." />
                  </div>
                  <div className="form-group">
                    <label>Valeur approximative (FCFA)</label>
                    <input type="number" value={valeurColis} onChange={(e) => setValeurColis(e.target.value)} placeholder="Ex: 5000" />
                  </div>
                  <div className="form-group">
                    <label>Instructions particulières</label>
                    <input type="text" value={instructionsLivreur} onChange={(e) => setInstructionsLivreur(e.target.value)} placeholder="Ex: Remettre en main propre" />
                  </div>
                </>
              )}

              {/* Leaflet GPS Mapping */}
              <div className="form-group full-width">
                <label><i className="fa-solid fa-earth-africa"></i> Position GPS de livraison (Optionnel)</label>
                <div ref={mapContainerRef} className="mini-map"></div>
                <span className="map-help">Cliquez sur la carte pour définir précisément le point de livraison</span>
              </div>

              {/* Order Summary box */}
              <div className="form-group full-width order-summary-box">
                {userProfileType === 'e-commercant' ? (
                  <>
                    <div className="summary-line">
                      <span>Montant commande :</span>
                      <span>{(parseFloat(montantCmd) || 0).toLocaleString()} FCFA</span>
                    </div>
                    <div className="summary-line">
                      <span>Frais livraison :</span>
                      <span>{deliveryFee.toLocaleString()} FCFA</span>
                    </div>
                    <div className="summary-line total-line">
                      <span>Montant à encaisser :</span>
                      <span>{((modePaiement === 'livraison' ? (parseFloat(montantCmd) || 0) : 0) + deliveryFee).toLocaleString()} FCFA</span>
                    </div>
                  </>
                ) : (
                  <div className="summary-line total-line">
                    <span>Frais de livraison :</span>
                    <span>{deliveryFee.toLocaleString()} FCFA</span>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary full-width submit-btn">
                <i className="fa-solid fa-paper-plane"></i> {userProfileType === 'e-commercant' ? 'CONFIRMER LA COMMANDE' : 'DEMANDER LA LIVRAISON'}
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
