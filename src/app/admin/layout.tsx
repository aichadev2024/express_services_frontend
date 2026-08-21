"use client";

import { useState, useEffect, type ReactNode, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import PhoneInput from '@/components/PhoneInput';
import { useToasts, ToastContainer } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import { useStoredToken, setStoredToken } from '@/lib/authToken';
import type { LoginResponse } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'fa-gauge-high' },
  { href: '/admin/commandes', label: 'Commandes', icon: 'fa-list-check' },
  { href: '/admin/stocks', label: 'Stocks & Produits', icon: 'fa-warehouse' },
  { href: '/admin/partenaires', label: 'Partenaires', icon: 'fa-handshake' },
  { href: '/admin/livreurs', label: 'Livreurs', icon: 'fa-users-gear' },
  { href: '/admin/quartiers', label: 'Quartiers', icon: 'fa-location-dot' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const token = useStoredToken('admin_token');

  const [mounted, setMounted] = useState(false);
  const [showAdminPassModal, setShowAdminPassModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const { toasts, showToast } = useToasts();

  // Password Visibility States
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Registration States
  const [hasAdmin, setHasAdmin] = useState(true);
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regNom, setRegNom] = useState('');
  const [regPrenom, setRegPrenom] = useState('');
  const [regTelephone, setRegTelephone] = useState('');
  const [regError, setRegError] = useState('');

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // OTP and First Login States
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Change Password Form States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePassError, setChangePassError] = useState('');

  const [showChangeOldPass, setShowChangeOldPass] = useState(false);
  const [showChangeNewPass, setShowChangeNewPass] = useState(false);
  const [showChangeConfirmPass, setShowChangeConfirmPass] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const exists = await apiFetch<boolean>('/auth/has-admin');
        setHasAdmin(exists);
        if (!exists) {
          setActiveTab('register');
        } else {
          setActiveTab('login');
        }
      } catch (err) {
        console.error("Erreur lors de la vérification de l'existence d'un administrateur", err);
      }
    }
    if (!token) {
      checkAdmin();
    }
  }, [token]);

  // Check if password change is required on load or token update
  useEffect(() => {
    if (!token) return;
  }, [token]);

  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRegError('');
    if (regPassword !== regConfirmPassword) {
      setRegError("Les mots de passe ne correspondent pas.");
      return;
    }
    try {
      await apiFetch('/auth/register-admin', {
        method: 'POST',
        body: {
          username: regUsername,
          email: regEmail,
          password: regPassword,
          nom: regNom,
          prenom: regPrenom,
          telephone: regTelephone
        }
      });
      showToast('Compte administrateur créé avec succès ! Veuillez vous connecter.');
      setHasAdmin(true);
      setActiveTab('login');
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
      setRegNom('');
      setRegPrenom('');
      setRegTelephone('');
    } catch (err: any) {
      setRegError(err.message || "Une erreur est survenue lors de la création du compte.");
    }
  };

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const data = await apiFetch<any>('/auth/login', {
        method: 'POST',
        body: { username: loginUsername, password: loginPassword },
      });
      if (data.otpRequired) {
        setOtpRequired(true);
        showToast('Code OTP de validation requis pour votre première connexion.', 'warning');
      } else {
        if (data.firstLogin) {
          setMustChangePassword(true);
        } else {
          setMustChangePassword(false);
        }
        setStoredToken('admin_token', data.token);
        showToast('Connexion administrative réussie.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Identifiant ou mot de passe incorrect.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOtpSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const data = await apiFetch<any>('/auth/verify-otp', {
        method: 'POST',
        body: { username: loginUsername, otpCode }
      });
      if (data.firstLogin) {
        setMustChangePassword(true);
      } else {
        setMustChangePassword(false);
      }
      setStoredToken('admin_token', data.token);
      showToast('Validation OTP réussie.');
      setOtpRequired(false);
      setOtpCode('');
    } catch (err: any) {
      setLoginError(err.message || 'Code OTP incorrect ou expiré.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleChangePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setChangePassError('');

    if (newPassword.length < 6) {
      setChangePassError("Le nouveau mot de passe doit faire au moins 6 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePassError("Le nouveau mot de passe et sa confirmation ne correspondent pas.");
      return;
    }

    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        token,
        body: { oldPassword, newPassword }
      });
      showToast('Votre mot de passe a été mis à jour avec succès !');
      setMustChangePassword(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setChangePassError(err.message || "Erreur lors du changement de mot de passe.");
    }
  };

  const handleLogout = () => {
    setStoredToken('admin_token', null);
    setMustChangePassword(false);
    setOtpRequired(false);
    showToast('Déconnexion réussie.');
  };

  if (!mounted) {
    return (
      <div className="app-container">
        <Header activeHref="/admin" />
        <div className="login-container" style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ color: '#0d2149', fontSize: '15px', fontWeight: 600 }}>Chargement de l&apos;administration...</div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="app-container">
        <Header activeHref="/admin" />
        <div className="login-container">
          <div className="login-grid-card">
            {/* Visual Branding Panel */}
            <div className="login-brand-panel">
              <div className="login-brand-overlay"></div>
              <div className="login-brand-content">
                <div className="login-brand-logo">
                  <img src="/logo.svg" alt="Express Services Logo" />
                </div>
                <h1 className="login-brand-title">
                  <span>E</span>XPRESS SERVICES
                </h1>
                <p className="login-brand-desc">
                  Votre plateforme centralisée de gestion des stocks, d'administration des partenaires, et de pilotage des livraisons en temps réel.
                </p>
                <div className="login-features">
                  <div className="login-feature-item">
                    <i className="fa-solid fa-circle-check"></i>
                    <span>Supervision globale en temps réel</span>
                  </div>
                  <div className="login-feature-item">
                    <i className="fa-solid fa-circle-check"></i>
                    <span>Gestion des commandes & assignations</span>
                  </div>
                  <div className="login-feature-item">
                    <i className="fa-solid fa-circle-check"></i>
                    <span>Statistiques & rapports avancés</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Panel */}
            <div className="login-form-panel">
              <div className="login-logo-mobile">
                <img src="/logo.svg" alt="Express Services Logo" />
              </div>

              {/* Tab Selector */}
              <div className="login-tabs">
                <button
                  type="button"
                  className={`login-tab ${activeTab === 'login' ? 'active' : ''}`}
                  onClick={() => setActiveTab('login')}
                >
                  <i className="fa-solid fa-right-to-bracket"></i> Connexion
                </button>
                <button
                  type="button"
                  className={`login-tab ${activeTab === 'register' ? 'active' : ''} ${hasAdmin ? 'disabled' : ''}`}
                  onClick={() => {
                    if (hasAdmin) {
                      showToast("L'inscription est désactivée. Un administrateur existe déjà.", "warning");
                    } else {
                      setActiveTab('register');
                    }
                  }}
                >
                  <i className={`fa-solid ${hasAdmin ? 'fa-lock' : 'fa-user-plus'}`}></i> Inscription
                </button>
              </div>

              {activeTab === 'login' ? (
                <>
                  <div className="login-form-header">
                    <h2>{otpRequired ? "Vérification OTP" : "Connexion Administration"}</h2>
                    <p>
                      {otpRequired
                        ? "Veuillez saisir le code de sécurité à 6 chiffres affiché dans les journaux console du serveur."
                        : "Gérez vos commandes, livreurs, partenaires et stocks."}
                    </p>
                  </div>

                  {loginError && (
                    <div className="login-error-badge">
                      <span>{loginError}</span>
                    </div>
                  )}

                  {otpRequired ? (
                    <form onSubmit={handleOtpSubmit} className="login-form">
                      <div className="login-input-group">
                        <label>Code de validation OTP</label>
                        <div className="input-wrapper">
                          <i className="fa-solid fa-shield-halved"></i>
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            required
                            placeholder="Ex: 123456"
                            style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}
                          />
                        </div>
                      </div>

                      <button type="submit" className="btn btn-primary login-btn">
                        Valider le code <i className="fa-solid fa-check"></i>
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setOtpRequired(false);
                          setOtpCode('');
                          setLoginError('');
                        }}
                        style={{ marginTop: '10px', width: '100%' }}
                      >
                        Retour aux identifiants
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleLoginSubmit} className="login-form">
                      <div className="login-input-group">
                        <label>Identifiant</label>
                        <div className="input-wrapper">
                          <i className="fa-solid fa-user"></i>
                          <input
                            type="text"
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
                            required
                            placeholder="admin"
                          />
                        </div>
                      </div>

                      <div className="login-input-group" style={{ marginTop: '15px' }}>
                        <label>Mot de passe</label>
                        <div className="input-wrapper">
                          <i className="fa-solid fa-lock"></i>
                          <input
                            type={showLoginPassword ? 'text' : 'password'}
                            className="with-toggle"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                          >
                            <i className={`fa-solid ${showLoginPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        </div>
                      </div>

                      <button type="submit" className="btn btn-primary login-btn" disabled={isLoggingIn}>
                        {isLoggingIn ? (
                          <>Connexion en cours... <i className="fa-solid fa-spinner fa-spin"></i></>
                        ) : (
                          <>Se Connecter <i className="fa-solid fa-arrow-right"></i></>
                        )}
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <>
                  <div className="login-form-header">
                    <h2>Créer le Premier Admin</h2>
                    <p>Initialisez le système en créant le premier compte d'administration.</p>
                  </div>

                  {regError && (
                    <div className="login-error-badge">
                      <span>{regError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegisterSubmit} className="login-form">
                    <div className="login-input-group">
                      <label>Nom</label>
                      <div className="input-wrapper">
                        <i className="fa-solid fa-address-card"></i>
                        <input
                          type="text"
                          value={regNom}
                          onChange={(e) => setRegNom(e.target.value)}
                          required
                          placeholder="Nom de famille"
                        />
                      </div>
                    </div>

                    <div className="login-input-group" style={{ marginTop: '15px' }}>
                      <label>Prénom</label>
                      <div className="input-wrapper">
                        <i className="fa-solid fa-user-tag"></i>
                        <input
                          type="text"
                          value={regPrenom}
                          onChange={(e) => setRegPrenom(e.target.value)}
                          required
                          placeholder="Prénom"
                        />
                      </div>
                    </div>

                    <div className="login-input-group" style={{ marginTop: '15px' }}>
                      <label>Identifiant de connexion</label>
                      <div className="input-wrapper">
                        <i className="fa-solid fa-user"></i>
                        <input
                          type="text"
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          required
                          placeholder="Ex: admin"
                        />
                      </div>
                    </div>

                    <div className="login-input-group" style={{ marginTop: '15px' }}>
                      <label>Adresse e-mail</label>
                      <div className="input-wrapper">
                        <i className="fa-solid fa-envelope"></i>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          required
                          placeholder="Ex: admin@example.com"
                        />
                      </div>
                    </div>

                    <div className="login-input-group" style={{ marginTop: '15px' }}>
                      <label>Téléphone</label>
                      <PhoneInput
                        value={regTelephone}
                        onChange={setRegTelephone}
                        required
                        placeholder="70 00 00 00"
                      />
                    </div>

                    <div className="login-input-group" style={{ marginTop: '15px' }}>
                      <label>Mot de passe</label>
                      <div className="input-wrapper">
                        <i className="fa-solid fa-lock"></i>
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          className="with-toggle"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          required
                          placeholder="Mot de passe sécurisé"
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                        >
                          <i className={`fa-solid ${showRegPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>

                    <div className="login-input-group" style={{ marginTop: '15px' }}>
                      <label>Confirmer le mot de passe</label>
                      <div className="input-wrapper">
                        <i className="fa-solid fa-lock-open"></i>
                        <input
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          className="with-toggle"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          required
                          placeholder="Confirmez le mot de passe"
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        >
                          <i className={`fa-solid ${showRegConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary login-btn">
                      Créer le Compte & Continuer <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
        <ToastContainer toasts={toasts} />
      </div>
    );
  }



  return (
    <div className="app-container">
      <Header
        activeHref="/admin"
        statusBadge={<span className="status-badge online"><i className="fa-solid fa-user-shield"></i> Administrateur</span>}
      />

      <main className="main-content">
        <div className="admin-dashboard-container active">
          <div className="inner-tabs">
            {ADMIN_NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`inner-tab-btn ${pathname === item.href ? 'active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                <i className={`fa-solid ${item.icon}`}></i> {item.label}
              </Link>
            ))}
            <button onClick={() => { setChangePassError(''); setShowAdminPassModal(true); }} className="btn btn-secondary" style={{ marginRight: '8px' }}>
              <i className="fa-solid fa-key"></i> Mot de passe
            </button>
            <button onClick={handleLogout} className="btn btn-secondary btn-logout">
              <i className="fa-solid fa-right-from-bracket"></i> Déconnexion
            </button>
          </div>

          {children}
        </div>
      </main>

      {/* Modal Changement de Mot de Passe Admin */}
      {showAdminPassModal && (
        <div className="login-modal-overlay" onClick={() => setShowAdminPassModal(false)}>
          <div className="login-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="login-form-header">
              <h2>Changer mon Mot de Passe</h2>
              <p>Mettez à jour votre mot de passe d'administration en toute sécurité.</p>
            </div>

            {changePassError && (
              <div className="login-error-badge">
                <span>{changePassError}</span>
              </div>
            )}

            <form onSubmit={async (e) => {
              await handleChangePasswordSubmit(e);
              setShowAdminPassModal(false);
            }} className="login-form">
              <div className="login-input-group">
                <label>Mot de passe actuel</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-lock"></i>
                  <input
                    type={showChangeOldPass ? 'text' : 'password'}
                    className="with-toggle"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowChangeOldPass(!showChangeOldPass)}
                  >
                    <i className={`fa-solid ${showChangeOldPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="login-input-group" style={{ marginTop: '15px' }}>
                <label>Nouveau mot de passe</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-key"></i>
                  <input
                    type={showChangeNewPass ? 'text' : 'password'}
                    className="with-toggle"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Au moins 6 caractères"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowChangeNewPass(!showChangeNewPass)}
                  >
                    <i className={`fa-solid ${showChangeNewPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="login-input-group" style={{ marginTop: '15px' }}>
                <label>Confirmer le nouveau mot de passe</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-check-double"></i>
                  <input
                    type={showChangeConfirmPass ? 'text' : 'password'}
                    className="with-toggle"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirmer"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowChangeConfirmPass(!showChangeConfirmPass)}
                  >
                    <i className={`fa-solid ${showChangeConfirmPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary login-btn" style={{ marginTop: '20px' }}>
                Enregistrer le mot de passe <i className="fa-solid fa-save"></i>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAdminPassModal(false)}
                style={{ width: '100%', marginTop: '10px' }}
              >
                Annuler
              </button>
            </form>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
