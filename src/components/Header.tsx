"use client";

import type { ReactNode } from 'react';

interface HeaderProps {
  activeHref?: string;
  statusBadge?: ReactNode;
}

/**
 * Header minimaliste pour l'application d'administration web d'Express Services.
 * Affiche uniquement le logo de marque et le badge d'état utilisateur (ex: Admin connecté).
 */
export default function Header({ activeHref, statusBadge }: HeaderProps) {
  return (
    <header className="header">
      <div className="logo-area">
        <div className="logo-icon-container">
          <img src="/logo.svg" alt="Express Services Logo" className="logo-svg" />
        </div>
        <div className="logo-text">
          <span className="logo-title">
            <span className="logo-red-accent">E</span>XPRESS
          </span>
          <span className="logo-subtitle">SERVICES</span>
        </div>
      </div>
      {statusBadge && <div className="user-status">{statusBadge}</div>}
    </header>
  );
}
