/**
 * Helper pour standardiser les appels API et faciliter l'intégration
 * avec l'API réelle
 */

// Types génériques pour les réponses API
export interface ApiResponse<T> {
  'hydra:member': T[];
  'hydra:totalItems': number;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalItems: number;
}

// Options pour les requêtes API
export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  revalidate?: number | false;
  tags?: string[];
  apiRoot?: string;
}

// Interface pour les paramètres de pagination
export interface PaginationParams {
  page?: number;
  itemsPerPage?: number;
}

// Fonction principale pour effectuer des appels API
export async function apiCall<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const apiRootEndpoint = options.apiRoot || process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT;

  if (!apiRootEndpoint) {
    throw new Error('API root endpoint not defined');
  }

  const url = `${apiRootEndpoint}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/ld+json',
      ...options.headers,
    },
    ...(options.body && { body: JSON.stringify(options.body) }),
    ...(options.next && { next: options.next }),
    ...(options.cache && { cache: options.cache }),
  };

  try {
    // Exécution normale du fetch
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error calling API endpoint ${endpoint}:`, error);
    throw error;
  }
}

// Helper pour la pagination standard de l'API Hydra
export async function fetchPaginatedResults<T, R>(
  endpoint: string,
  params: PaginationParams & Record<string, any> = {},
  transformer?: (data: T) => R,
  apiRoot?: string
): Promise<PaginatedResponse<R | T>> {
  // Construire les paramètres de requête pour la pagination
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append('page', params.page.toString());
  if (params.itemsPerPage) queryParams.append('itemsPerPage', params.itemsPerPage.toString());

  // Ajouter les autres paramètres
  Object.entries(params).forEach(([key, value]) => {
    if (key !== 'page' && key !== 'itemsPerPage' && value !== undefined && value !== null) {
      queryParams.append(key, value.toString());
    }
  });

  const queryString = queryParams.toString();
  const fullEndpoint = `${endpoint}${queryString ? '?' + queryString : ''}`;

  // Effectuer l'appel API
  const response = await apiCall<ApiResponse<T>>(fullEndpoint, { apiRoot });

  // Transformer les données si nécessaire
  const data = transformer ? response['hydra:member'].map(transformer) : response['hydra:member'];

  return {
    data: data as (R | T)[],
    totalItems: response['hydra:totalItems'],
  };
}

// Fonction pour récupérer une ressource par ID
export async function fetchResourceById<T>(resource: string, id: string | number): Promise<T> {
  return apiCall<T>(`${resource}/${id}`, {});
}

// Fonction pour appliquer les transformations de données
export function transformData<T, R>(data: T, transformer: (item: T) => R): R {
  return transformer(data);
}

// Helper pour transformer un tableau de données
export function transformArray<T, R>(data: T[], transformer: (item: T) => R): R[] {
  return data.map(transformer);
}
