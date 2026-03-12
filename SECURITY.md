# Sécurité

## Protection du Jeton d'Accès Mapbox

Cette application utilise Mapbox GL JS, ce qui nécessite un jeton d'accès public. Par nature, ce jeton est visible dans le code source côté client. Pour éviter toute utilisation abusive (vol de quota, frais inattendus), il est **impératif** de sécuriser votre jeton via le tableau de bord Mapbox.

### 1. Restrictions d'URL (HTTP Referrers)

La méthode la plus efficace pour protéger votre jeton est de limiter son utilisation à vos propres domaines :

1.  Connectez-vous à votre [compte Mapbox](https://account.mapbox.com/).
2.  Allez dans la section **Access Tokens**.
3.  Modifiez votre jeton (ou créez-en un nouveau dédié à ce projet).
4.  Sous **URL restrictions**, ajoutez les domaines autorisés (ex: `https://votre-domaine.com/*`).
5.  N'oubliez pas d'inclure `http://localhost:*` uniquement pendant la phase de développement.

### 2. Limitation de la Portée (Scopes)

Assurez-vous que votre jeton n'a que les permissions (scopes) strictement nécessaires. Pour cette application, seul le scope `styles:read` est généralement requis pour afficher la carte. Évitez de donner des permissions d'écriture ou d'administration à un jeton public.

### 3. Proxy Backend (Optionnel)

Pour une sécurité maximale, vous pouvez mettre en place un proxy backend qui injecte le jeton. Cependant, Mapbox GL JS est conçu pour utiliser le jeton directement pour charger les tuiles depuis leurs serveurs, ce qui rend le proxying complexe pour cette bibliothèque spécifique. La restriction par URL reste la recommandation standard.
