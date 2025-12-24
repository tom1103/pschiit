# pschiit

Une application Vue.js simple pour afficher les éphémérides du soleil et de la lune en fonction de la localisation et de la date.

## Architecture du projet

Le projet est structuré autour de plusieurs composants Vue single-file :

-   `App.vue`: Le composant racine qui intègre `TheSoleil`.
-   `TheSoleil.vue`: Le composant principal qui gère la logique de l'application.
-   `SunMoonGraph.vue`: Affiche un graphique (simplifié pour les tests).
-   `CarteLocalisation.vue`: Affiche une carte Mapbox.
-   `ModalComponent.vue`: Un composant de modale réutilisable.
-   `SunIcon.vue`: Un composant pour afficher différentes icônes SVG.

## Installation et Développement

### Prérequis

-   Node.js (version spécifiée dans `package.json`)
-   npm

### Installation

```sh
npm install
```

### Développement

```sh
npm run dev
```

### Tests

Pour lancer la suite de tests unitaires, exécutez :

```sh
npm run test
```
