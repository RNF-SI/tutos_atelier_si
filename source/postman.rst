.. _postman_tutoriel:

===========================================
Tutoriel : Optimiser son usage de Postman
===========================================

Ce tutoriel explique comment mettre en place et organiser une collection **Postman** pour un projet tel que **GeoNature** (ou tout autre projet modulaire). Nous aborderons :

- Les principes de classification et de convention de nommage des requêtes.
- L’utilisation de **l’environnement** Postman (variables, etc.).
- L’exemple d’une requête simple (par exemple un login).
- La manière de **documenter** efficacement sa collection.
- Enfin, une section "Pour aller plus loin" explorera les fonctionnalités avancées telles que les **APIs**, **Mock Servers**, **Monitors**, **Flows** et **History**.

.. contents:: Sommaire
   :depth: 2
   :local:

Introduction
============

**Postman** est un outil permettant de :

- Gérer et exécuter des requêtes HTTP (GET, POST, etc.) vers vos différentes APIs.
- Organiser ces requêtes en **collections** et **folders**, pour une meilleure lisibilité.
- Paramétrer des variables via des **environnements** (ex. localhost, préproduction, production).
- Rédiger une **documentation** intégrée, directement accessible par vos coéquipiers.

Dans le cadre du projet **GeoNature** (et de ses modules, ex. *gn_module_monitoring*), Postman nous permet d’exécuter des appels vers l’API de manière centralisée, de tester les retours, puis de partager aisément ces tests et leur documentation au sein de l’équipe.

Classification des requêtes et conventions de nommage
=====================================================

Pour éviter la confusion, il est recommandé de respecter quelques règles :

1. **Créer des folders (dossiers)** :
   
   - Un dossier “Auth” pour toutes les requêtes d’authentification (login, refresh token, etc.).
   - Un dossier par module ou thématique : “Monitoring - Chiro”, “Monitoring - Amphibien”, etc.

2. **Nommer les requêtes de façon explicite** :
   
   - ``[GET] Login - Admin``
   - ``[POST] Create site - Chiro``
   - ``[GET] List sites - Chiro``
   
   Cette syntaxe explicite la méthode HTTP (GET, POST, etc.) et le but de la requête.

3. **Faire des descriptions claires** :
   
   - Écrire dans Postman un paragraphe expliquant la finalité de la requête, les paramètres importants (headers, body) et éventuellement un exemple de retour JSON.

Exemple de requête (cas d'un login)
===================================

Pour illustrer le fonctionnement, prenons un **exemple de requête** (login).  
Cette requête sera placée dans le dossier “Auth”, avec pour nom **``[POST] Login - Admin``**.

.. note::
   Ici, nous mettons un exemple minimaliste. Dans votre collection, vous pouvez ajouter d’autres logins (agent, user, etc.) ou encore des refresh tokens.

**Méthode**  
POST
**URL**  
http://127.0.0.1:8000/auth/login

*(Ou ``{{base_url}}/auth/login`` si vous utilisez une variable d’environnement.)*

**Headers**  
- ``Content-Type: application/json``

**Body** (format JSON)
{ "login": "admin", "password": "admin", "id_application": 1 }

Exemple de retour
-----------------

En général, l’API renvoie un token (JWT ou autre) ainsi que des informations basiques :

.. code-block:: json

   {
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
     "user_role": "admin",
     "expires_in": 3600
   }

Si l’authentification échoue, on peut obtenir un code ``401 Unauthorized`` ou un message d’erreur au format JSON.

Environnements et variables
===========================

Pour éviter de multiplier les URL (localhost, préprod, production), on peut utiliser un **environnement** Postman.

1. Dans Postman, cliquez sur l’icône d’engrenage > **Manage Environments**.
2. Créez un environnement nommé par ex. *Localhost GeoNature*.
3. Ajoutez une variable ``base_url`` avec pour valeur ``http://127.0.0.1:8000``.

Ensuite, dans vos requêtes, remplacez ``http://127.0.0.1:8000`` par ``{{base_url}}``.

.. note::
   Après un login réussi, vous pouvez stocker le token dans une variable ``{{auth_token}}`` via un script Postman (onglet **Tests**). Cela permet de l’injecter automatiquement dans l’en-tête des requêtes suivantes.

Documentation
=============

Pour chaque requête, vous pouvez renseigner la section **Documentation** dans Postman :

- **Titre** : ``[POST] Login - Admin``
- **Courte description** : Permet de s’authentifier en tant qu’administrateur...
- **Paramètres** :
  
  - Body : ``login``, ``password``, ``id_application``
- **Réponse attendue** : ``token`` JWT, status ``200 OK``, etc.

Vos coéquipiers peuvent alors consulter directement cette description dans Postman, ou vous pouvez **publier** la documentation en ligne grâce à Postman.

Pour aller plus loin
====================

En plus des fonctionnalités de base (requêtes, variables, collections), Postman propose :

- **APIs** : gérer un schéma OpenAPI (Swagger) directement dans Postman et générer automatiquement des collections de tests.
- **Mock Servers** : simuler vos endpoints pour tester un front-end même quand l’API réelle n’est pas encore disponible.
- **Monitors** : exécuter automatiquement (toutes les heures, tous les jours) vos requêtes pour détecter des pannes ou surveiller les performances.
- **Flows** : créer des scénarios visuels pour enchaîner plusieurs requêtes et automatiser des suites de tests.
- **History** : retrouver l’historique complet de toutes les requêtes effectuées (même non enregistrées dans la collection).

Conclusion
==========

Avec ces principes de **classification** (folders, noms explicites), ces **conventions de nommage**, l’usage d’**environnements** pour gérer vos URL/variables et une **documentation** claire directement dans Postman, vous gagnez en lisibilité et en efficacité pour travailler en équipe sur l’API GeoNature (ou tout autre projet).

**Prochaines étapes** :

- Affiner la documentation de chaque requête existante (décrire le corps, les paramètres, la réponse).
- Créer des tests automatisés (dans l’onglet **Tests**) pour valider le format de réponse ou le code HTTP.
- Partager votre collection (et ses environnements) avec vos coéquipiers ou via un espace Team Postman.

----