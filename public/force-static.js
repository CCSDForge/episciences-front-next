// Script pour forcer la navigation statique et désactiver Next.js Router
(function() {
  // Attendre que le DOM soit chargé
  document.addEventListener('DOMContentLoaded', function() {
    // Désactiver le routeur Next.js s'il est présent
    if (window.next && window.next.router) {
      try {
        // Remplacer les méthodes de navigation par des redirections complètes
        const originalPush = window.next.router.push;
        const originalReplace = window.next.router.replace;
        
        window.next.router.push = function(url) {
          window.location.href = typeof url === 'string' ? url : url.pathname || '/';
          return Promise.resolve(false);
        };
        
        window.next.router.replace = function(url) {
          window.location.href = typeof url === 'string' ? url : url.pathname || '/';
          return Promise.resolve(false);
        };
        
        // Désactiver la préfetch pour éviter les appels RSC
        if (window.next.router.prefetch) {
          window.next.router.prefetch = function() {
            return Promise.resolve();
          };
        }
      } catch (e) {
        console.warn('Impossible de désactiver le router Next.js:', e);
      }
    }
    
    // Intercepter tous les clics sur les liens
    document.addEventListener('click', function(e) {
      // Trouver si le clic était sur un lien
      const link = e.target.closest('a');
      
      // Vérifier si c'est un lien interne qui doit être traité manuellement
      if (link && 
          link.getAttribute('href') && 
          !link.getAttribute('href').startsWith('http') && 
          !link.getAttribute('href').startsWith('//') && 
          !link.getAttribute('href').startsWith('mailto:') &&
          !link.getAttribute('href').startsWith('#') &&
          !link.getAttribute('target')) {
        
        // Empêcher la navigation côté client
        e.preventDefault();
        
        // Construire le chemin absolu
        let path = link.getAttribute('href');
        if (!path.startsWith('/')) {
          path = '/' + path;
        }
        
        // Nettoyer le chemin
        path = path.replace(/\/+/g, '/');
        
        // Traiter les chemins avec paramètres de requête
        const [basePath, queryString] = path.split('?');
        
        // S'assurer que les chemins se terminent par / pour pointer vers index.html
        let finalPath = basePath;
        if (!finalPath.endsWith('/')) {
          finalPath = finalPath + '/';
        }
        
        // Reconstruire l'URL complète
        let targetUrl = window.location.origin + finalPath;
        if (queryString) {
          targetUrl += '?' + queryString;
        }
        
        // Rediriger vers la page
        window.location.href = targetUrl;
      }
    }, true);
    
    // Empêcher les événements de navigation AJAX
    if (window.history && window.history.pushState) {
      const originalPushState = window.history.pushState;
      window.history.pushState = function() {
        // Ne pas effectuer de pushState pour éviter la navigation AJAX
        return;
      };
    }
  });
})(); 