// Types partages, alignes sur les DTOs du backend (com.expressservices.*.dto.*)

export type StatutCommande =
  | 'EN_ATTENTE'
  | 'EN_COURS'
  | 'LIVREE'
  | 'ANNULEE'
  | 'REJETEE'
  | 'REPORTEE'
  | 'INJOIGNABLE';

export interface Quartier {
  id: number;
  nom: string;
  tarifLivraison: number;
}

export interface Partenaire {
  id: number;
  nom: string;
  telephone: string;
}

export interface Produit {
  id: number;
  nom: string;
  prix: number;
  description: string | null;
  stock: number;
  quantiteStock?: number;
  actif: boolean;
  partenaireId: number | null;
  partenaireNom: string | null;
  partenaire?: Partenaire | null;
}

export interface ProduitStockStats {
  id: number;
  nom: string;
  stockDisponible: number;
  sortisPourLivraison: number;
  restants: number;
  retournes: number;
}

export interface LigneProduit {
  produitId: number;
  produitNom: string;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
}

export interface Commande {
  id: number;
  nomClient: string;
  telephoneClient: string;
  emailClient: string | null;
  lignesProduits: LigneProduit[];
  quartierId: number;
  quartierNom: string;
  tarifLivraison: number;
  adressePrecise: string;
  latitude: number | null;
  longitude: number | null;
  dateHeureSouhaitee: string | null;
  statut: StatutCommande;
  dateCreation: string;
  livreurId: number | null;
  livreurUsername: string | null;
  livreurNom: string | null;
  livreurPrenom: string | null;
  montantProduits: number;
  montantTotal: number;
  partenaireId: number | null;
  partenaireNom: string | null;
  descriptionArticle: string | null;
  motifAnnulation?: string | null;
}

export interface DashboardStats {
  totalCommandesDuJour: number;
  commandesEnAttente: number;
  commandesEnCours: number;
  commandesLivrees: number;
  commandesAnnulees: number;
  commandesRejetees: number;
  commandesReportees: number;
  commandesInjoignables: number;
  montantTotalDuJour: number;
}

export interface Livreur {
  id: number;
  username: string;
  nom: string | null;
  prenom: string | null;
  email?: string | null;
  telephone?: string | null;
  role: string;
  dateCreation: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  role: string;
}

export interface ApiErrorBody {
  message?: string;
  error?: string;
}
