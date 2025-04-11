/**
 * Utilitaires pour la génération statique Next.js
 */

/**
 * Détecte si le code s'exécute au moment de la génération statique de Next.js
 * (environnement de production et côté serveur)
 */
export const isStaticBuild = () => {
  return process.env.NODE_ENV === 'production' && typeof window === 'undefined';
};

// Mock data pour les auteurs
export const mockAuthors = {
  "hydra:member": [
    {
      "@id": "/api/authors/1",
      "values": {
        "name": "Jean Dupont",
        "count": 3
      }
    },
    {
      "@id": "/api/authors/2",
      "values": {
        "name": "Marie Martin",
        "count": 2
      }
    },
    {
      "@id": "/api/authors/3",
      "values": {
        "name": "Pierre Durand",
        "count": 4
      }
    }
  ],
  "hydra:totalItems": 3,
  "hydra:range": {
    "A": 5,
    "B": 3,
    "D": 4,
    "M": 6,
    "P": 4
  }
};

// Mock data pour les articles
export const mockArticles = {
  "hydra:member": [
    {
      "@id": "/api/articles/1",
      "@type": "Article",
      "id": 1,
      "title": "Article exemple pour génération statique",
      "abstract": "Ceci est un résumé d'article créé pour la génération statique.",
      "authors": [
        {
          "fullname": "Jean Dupont",
          "email": "jean.dupont@example.com",
          "orcid": "0000-0000-0000-0000"
        }
      ],
      "status": "published",
      "publicationDate": "2023-01-01T00:00:00+00:00",
      "doi": "10.xxxx/xxxx.xxxx",
      "paperId": "12345",
      "volume": {
        "@id": "/api/volumes/1",
        "@type": "Volume",
        "id": 1,
        "name": "Volume 1"
      }
    }
  ],
  "hydra:totalItems": 1
};

// Mock data pour les statistiques
export const mockStatistics = {
  "hydra:member": [
    {
      "@id": "/api/statistics/1",
      "@type": "Statistics",
      "id": 1,
      "name": "Statistiques exemple",
      "value": "10"
    }
  ],
  "hydra:totalItems": 1
};

// Mock data pour les actualités
export const mockNews = {
  "hydra:member": [
    {
      "@id": "/api/news/1",
      "@type": "News",
      "id": 1,
      "title": "Actualité exemple",
      "content": "Contenu de l'actualité exemple pour la génération statique.",
      "publicationDate": "2023-01-01T00:00:00+00:00"
    }
  ],
  "hydra:totalItems": 1
};

// Mock data pour la page à propos
export const mockAboutPage = {
  "@id": "/api/about/1",
  "@type": "AboutPage",
  "id": 1,
  "content": "<h1>À propos de la revue</h1><p>Contenu de la page à propos pour la génération statique.</p>"
};

// Mock data pour les membres
export const mockMembers = {
  "hydra:member": [
    {
      "@id": "/api/members/1",
      "@type": "Member",
      "id": 1,
      "fullname": "Marie Martin",
      "role": "Éditeur en chef",
      "email": "marie.martin@example.com"
    }
  ],
  "hydra:totalItems": 1
};

// Mock data pour les indexations
export const mockIndexations = {
  "hydra:member": [
    {
      "@id": "/api/indexations/1",
      "@type": "Indexation",
      "id": 1,
      "name": "Indexation exemple",
      "url": "https://example.com"
    }
  ],
  "hydra:totalItems": 1
};

// Mock data pour les volumes
export const mockVolumes = {
  "hydra:member": [
    {
      "@id": "/api/volumes/1",
      "@type": "Volume",
      "id": 1,
      "name": "Volume 1",
      "publicationDate": "2023-01-01T00:00:00+00:00",
      "articleCount": 5
    }
  ],
  "hydra:totalItems": 1
};

/**
 * Fonction wrapper pour les appels fetch qui peut retourner des données statiques
 * si nous sommes en génération statique et que la requête échoue
 */
export const fetchWithFallback = async (url: string, options: RequestInit = {}, mockData: any = null) => {
  // Si nous ne sommes pas en génération statique, continuer normalement
  if (!isStaticBuild()) {
    return fetch(url, options);
  }

  try {
    // Essayer d'abord l'appel API normal
    const response = await fetch(url, options);
    if (response.ok) {
      return response;
    }
    
    // Si l'API échoue et que nous avons des données de maquette, les utiliser
    if (mockData) {
    //  console.log(`Utilisation de données statiques pour ${url}`);
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Sinon, retourner la réponse d'origine
    return response;
  } catch (error) {
    // En cas d'erreur, utiliser les données de maquette si disponibles
    if (mockData) {
    //  console.log(`Erreur lors de l'appel à ${url}, utilisation de données statiques`);
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Sinon, propager l'erreur
    throw error;
  }
}; 