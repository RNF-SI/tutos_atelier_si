==============================================================================
Installer Keycloak et brancher GeoNature dessus (Atelier du 30 septembre 2026)
==============================================================================

.. contents:: Table des matières
   :local:
   :depth: 2

Ce tutoriel reprend pas à pas la mise en place complète : installation d'un serveur Keycloak
en production, paramétrage du realm, des clients et des groupes, contrôle d'accès applicatif,
puis configuration de GeoNature avec le provider ``KeycloakOrganismProvider``.

Il est le pendant pratique de la présentation :doc:`keycloak`, qui en donne la vue d'ensemble
et le support projeté en séance.

.. container:: info-box

   **Le principe à garder en tête**

   Keycloak répond à « qui es-tu ? » et « as-tu le droit d'entrer dans cette application ? ».
   GeoNature reste seul à répondre à « que peux-tu faire sur la donnée ? » : le CRUVED, les
   profils par application et la portée des données ne sont pas modifiés.

.. NOTE::

   Les sections « Paramétrer Keycloak », « Configurer GeoNature » et « Dépannage » reprennent
   la documentation du dépôt GeoNature (``docs/KEYCLOAK_GEONATURE.md``,
   ``DEPLOYMENT_KEYCLOAK.md``), issue d'une implémentation réellement déployée. La section
   « Installer Keycloak » décrit en revanche une installation Keycloak standard : elle est à
   adapter à la politique d'infrastructure de votre établissement.

Prérequis
=========

Côté serveur
------------

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Élément
     - Recommandation
   * - Système
     - Debian 12 / Ubuntu 22.04 LTS ou plus récent, à jour
   * - CPU / RAM
     - 2 vCPU et 2 Go de RAM suffisent pour un realm de quelques centaines de comptes
   * - Java
     - JDK 21 (Keycloak tourne sur Quarkus ; la version exacte requise est indiquée dans les
       notes de version de Keycloak)
   * - Base de données
     - PostgreSQL 13+, **distincte de celle de GeoNature** (même serveur possible, base dédiée)
   * - Nom de domaine
     - Un enregistrement DNS dédié, par exemple ``keycloak.mon-domaine.fr``
   * - Certificat TLS
     - Obligatoire : un code d'autorisation qui transite en clair est un compte compromis

.. WARNING::

   Keycloak doit être servi derrière **un seul et unique hostname**. Alterner entre
   ``localhost`` et ``127.0.0.1``, ou entre deux noms de domaine, fait perdre les cookies de
   session et provoque des erreurs ``MismatchingStateError`` et des boucles de connexion.

Côté GeoNature
--------------

* Une instance GeoNature fonctionnelle, avec le sous-module
  ``UsersHub-authentification-module`` (``pypnusershub``) à jour.
* Le fichier ``backend/geonature/keycloak_provider.py`` (fourni intégralement plus bas).
* **Une sauvegarde de la base de données** avant toute mise en service : le provider écrit dans
  ``utilisateurs.t_roles`` et ``utilisateurs.bib_organismes``.
* Un compte administrateur local GeoNature conservé pour l'accès de secours.

Installer Keycloak sur le serveur
=================================

Java et utilisateur système
---------------------------

.. code-block:: bash

   sudo apt update
   sudo apt install -y openjdk-21-jre-headless unzip
   sudo useradd -r -m -d /opt/keycloak -s /sbin/nologin keycloak

Télécharger et déployer Keycloak
--------------------------------

Récupérer la dernière version stable sur
`la page des releases Keycloak <https://github.com/keycloak/keycloak/releases>`_ et
l'installer dans ``/opt/keycloak`` :

.. code-block:: bash

   KC_VERSION=26.0.7   # à remplacer par la version stable du moment
   cd /tmp
   wget https://github.com/keycloak/keycloak/releases/download/${KC_VERSION}/keycloak-${KC_VERSION}.zip
   unzip keycloak-${KC_VERSION}.zip
   sudo rm -rf /opt/keycloak && sudo mv keycloak-${KC_VERSION} /opt/keycloak
   sudo chown -R keycloak:keycloak /opt/keycloak
   sudo chmod o-rwx /opt/keycloak

Créer la base de données
------------------------

.. code-block:: bash

   sudo -u postgres psql <<'SQL'
   CREATE USER keycloak WITH PASSWORD 'mot_de_passe_solide';
   CREATE DATABASE keycloak OWNER keycloak;
   SQL

Configurer ``keycloak.conf``
----------------------------

Fichier ``/opt/keycloak/conf/keycloak.conf`` :

.. code-block:: ini

   # Base de données
   db=postgres
   db-url=jdbc:postgresql://localhost:5432/keycloak
   db-username=keycloak
   db-password=mot_de_passe_solide

   # Hostname public, servi derrière un reverse proxy TLS
   hostname=https://keycloak.mon-domaine.fr
   proxy-headers=xforwarded
   http-enabled=true
   http-host=127.0.0.1
   http-port=8080

   # Indispensable au script authenticator « Client Access Guard »
   features=preview,scripts

.. IMPORTANT::

   La ligne ``features=preview,scripts`` n'est pas optionnelle : sans elle, le script
   authenticator décrit plus loin n'apparaîtra jamais dans la liste des exécutions du browser
   flow. Les noms d'options de hostname et de proxy ont changé entre les versions majeures de
   Keycloak — vérifier la syntaxe dans la documentation de la version installée.

Construire l'image optimisée
----------------------------

Toute modification de ``features``, du moteur de base de données ou du contenu de
``/opt/keycloak/providers/`` impose de rejouer le build :

.. code-block:: bash

   sudo -u keycloak /opt/keycloak/bin/kc.sh build

.. WARNING::

   Sans ``build``, un JAR déposé dans ``providers/`` n'est pas chargé et Keycloak loggue
   seulement ``A provider JAR was updated since the last build, please rebuild``. C'est la
   cause numéro un des « le script n'apparaît pas dans la liste ».

Service systemd
---------------

Fichier ``/etc/systemd/system/keycloak.service`` :

.. code-block:: ini

   [Unit]
   Description=Keycloak Identity Provider
   After=network.target postgresql.service

   [Service]
   User=keycloak
   Group=keycloak
   ExecStart=/opt/keycloak/bin/kc.sh start --optimized
   Restart=on-failure
   RestartSec=5
   LimitNOFILE=102642

   [Install]
   WantedBy=multi-user.target

Créer le compte administrateur initial, puis démarrer le service :

.. code-block:: bash

   # Compte d'amorçage, uniquement pour le premier démarrage
   sudo -u keycloak KC_BOOTSTRAP_ADMIN_USERNAME=admin \
        KC_BOOTSTRAP_ADMIN_PASSWORD='mot_de_passe_temporaire' \
        /opt/keycloak/bin/kc.sh start --optimized &

   sudo systemctl daemon-reload
   sudo systemctl enable --now keycloak
   sudo systemctl status keycloak

.. NOTE::

   Le nom des variables d'amorçage de l'administrateur a changé selon les versions
   (``KEYCLOAK_ADMIN`` / ``KEYCLOAK_ADMIN_PASSWORD`` puis ``KC_BOOTSTRAP_ADMIN_*``). Se
   connecter ensuite à la console d'administration pour créer un compte nominatif, et
   supprimer le compte d'amorçage.

Reverse proxy et TLS
--------------------

Exemple pour nginx, avec un certificat Let's Encrypt :

.. code-block:: nginx

   server {
       listen 443 ssl http2;
       server_name keycloak.mon-domaine.fr;

       ssl_certificate     /etc/letsencrypt/live/keycloak.mon-domaine.fr/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/keycloak.mon-domaine.fr/privkey.pem;

       location / {
           proxy_pass http://127.0.0.1:8080;
           proxy_set_header Host              $host;
           proxy_set_header X-Real-IP         $remote_addr;
           proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header X-Forwarded-Host  $host;
           proxy_set_header X-Forwarded-Port  443;
       }
   }

   server {
       listen 80;
       server_name keycloak.mon-domaine.fr;
       return 301 https://$host$request_uri;
   }

.. WARNING::

   Sans ``X-Forwarded-Proto``, Keycloak génère des URLs de redirection en ``http://`` et le
   flux OIDC casse. C'est le pendant de l'option ``proxy-headers=xforwarded`` côté
   ``keycloak.conf``.

Vérifier l'installation
-----------------------

.. code-block:: bash

   # La découverte OIDC doit répondre en JSON
   curl -s https://keycloak.mon-domaine.fr/realms/master/.well-known/openid-configuration | jq .issuer

   # Les features preview doivent être listées au démarrage
   sudo journalctl -u keycloak | grep -i "Preview features enabled"

La seconde commande doit mentionner ``scripts``.

Paramétrer le realm
===================

Créer le realm
--------------

*Realm settings* → *Create realm* → nom ``si-rnf`` (exemple). L'URL du realm est l'``ISSUER``
que GeoNature mettra dans sa configuration :

.. code-block:: text

   https://keycloak.mon-domaine.fr/realms/si-rnf

*Realm settings* → *General* → *Endpoints* → *OpenID Endpoint Configuration* donne tous les
endpoints dérivés.

Les réglages qui comptent
-------------------------

.. list-table::
   :header-rows: 1
   :widths: 25 35 40

   * - Onglet
     - Paramètre
     - Valeur recommandée
   * - Login
     - User registration
     - OFF en production, ON en développement
   * - Login
     - Forgot password
     - ON (nécessite le SMTP configuré)
   * - Login
     - Login with email
     - ON
   * - Login
     - Edit username
     - OFF, pour garder un ``preferred_username`` stable
   * - Login
     - Duplicate emails / Remember me
     - OFF
   * - Tokens
     - Default Signature Algorithm
     - RS256
   * - Tokens
     - Access Token Lifespan
     - 5 à 15 minutes
   * - Tokens
     - Revoke Refresh Token
     - ON
   * - Sessions
     - SSO Session Idle / Max
     - 30 minutes / 10 heures
   * - Localization
     - Internationalization
     - ON, locale par défaut ``fr``
   * - Security defenses
     - Brute force detection
     - ON
   * - Themes
     - Login theme
     - ``rnf`` une fois le thème déployé (voir plus bas)

Les durées de token n'ont aucun effet sur la présence du claim ``groups`` : elles ne pilotent
que la validité des jetons.

Créer les groupes et porter l'organisme en attributs
====================================================

L'arborescence
--------------

*Groups* → *Create group*, les parents d'abord :

.. code-block:: text

   /applications
     /geonature-local          # droit d'entrée sur GeoNature web
     /occtax-mobile            # droit d'entrée sur l'application mobile

   /organismes
     /rn-test                  # organisme de rattachement + attributs

   /reserves
     /42                       # contexte métier réserve (usages à venir)

   /geonature
     /test
       /Grp_admin              # clés de group_mapping vers les groupes GeoNature

.. list-table::
   :header-rows: 1
   :widths: 25 75

   * - Branche
     - Intention
   * - ``/applications/…``
     - Droit d'entrée. Le groupe porte le rôle client ``access``.
   * - ``/organismes/…``
     - Organisme de rattachement. Porte les attributs lus par le provider.
   * - ``/reserves/…``
     - Contexte métier réserve, réservé aux usages à venir.
   * - ``/geonature/…``
     - Clés de ``group_mapping`` vers les groupes GeoNature.

Cette séparation n'est pas cosmétique : le mapper *Group Membership* natif n'offre **aucun
filtre par préfixe**, tous les groupes de l'utilisateur partent dans le claim. C'est le préfixe
du chemin qui permet ensuite de trier.

Les attributs des groupes organisme
-----------------------------------

*Groups* → ``/organismes/rn-test`` → onglet *Attributes* :

.. list-table::
   :header-rows: 1
   :widths: 25 35 40

   * - Clé exacte
     - Exemple de valeur
     - Usage dans GeoNature
   * - ``id_organisme``
     - ``45``
     - Clé primaire reprise telle quelle si l'organisme n'existe pas encore
   * - ``uuid_organisme``
     - ``a1b2c3d4-e5f6-7890-abcd-ef1234567890``
     - Identifiant pivot entre instances
   * - ``nom_organisme``
     - ``Réserve naturelle test``
     - Libellé ; à défaut le nom du groupe est utilisé

.. IMPORTANT::

   Dans Keycloak, un attribut de groupe est toujours une **liste de chaînes** : le provider lit
   ``attributes["id_organisme"][0]`` et convertit lui-même en entier. Ces attributs **ne sont
   jamais exposés dans le token** de l'utilisateur ; seule l'API d'administration les rend
   lisibles, d'où le client ``geonature-sync`` créé plus loin.

Exposer les groupes dans userinfo
=================================

Les client scopes
-----------------

Keycloak assemble les tokens à partir des **client scopes** assignés au client, et chaque scope
contient des mappers. Un claim manquant, c'est presque toujours un scope non assigné ou un
mapper absent.

.. list-table::
   :header-rows: 1
   :widths: 25 75

   * - Client scope (en **Default**)
     - Ce qu'il apporte
   * - ``openid``
     - ``sub``, ``iss``, ``aud``, ``exp``, ``iat``
   * - ``profile``
     - ``preferred_username``, ``given_name``, ``family_name``, ``name``
   * - ``email``
     - ``email``, ``email_verified``
   * - ``roles``
     - ``realm_access``, ``resource_access``, **et notre mapper** ``groups``
   * - ``web-origins``
     - en-têtes CORS, pas de claim

.. WARNING::

   Un scope en *Optional* n'est appliqué que si le client le demande explicitement. GeoNature
   demande ``openid email profile`` et rien d'autre — c'est codé en dur dans
   ``OpenIDProvider.configure()``. Tout scope utile doit donc être en **Default**.

Le mapper Group Membership
--------------------------

C'est le paramétrage le plus important de toute la chaîne.

*Client scopes* → ``roles`` → *Mappers* → *Add mapper* → *By configuration* → *Group Membership*

.. list-table::
   :header-rows: 1
   :widths: 30 12 58

   * - Champ
     - Valeur
     - Pourquoi
   * - Name
     - ``groups``
     - Libellé interne du mapper
   * - Token Claim Name
     - ``groups``
     - Doit correspondre à ``group_claim_name`` côté GeoNature
   * - Full group path
     - **ON**
     - Donne ``/organismes/rn-test`` et non ``rn-test`` : indispensable au préfixe et au mapping
   * - Add to userinfo
     - **ON**
     - Obligatoire : c'est la seule source lue par GeoNature
   * - Add to ID token
     - ON
     - Recommandé, pour déboguer
   * - Add to access token
     - ON
     - Recommandé, pour déboguer
   * - Add to token introspection
     - ON
     - Si l'option existe dans votre version

.. IMPORTANT::

   **GeoNature lit les groupes dans ``userinfo``, pas dans le JWT.** L'access token et l'ID
   token sont utiles au débogage mais ignorés par le code, tout comme ``realm_access.roles`` et
   ``resource_access``. Si *Add to userinfo* est désactivé, le token contient bien les groupes,
   l'organisme n'est jamais résolu, et seul un warning apparaît dans les logs du backend.

   Une variante consiste à créer un client scope dédié ``groups`` et à l'assigner en *Default* au
   client. Poser le mapper sur le scope ``roles`` est plus simple, car ce scope est déjà assigné
   par défaut à tous les clients.

Vérifier avant d'aller plus loin
--------------------------------

.. code-block:: bash

   ISSUER=https://keycloak.mon-domaine.fr/realms/si-rnf
   curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
     "$ISSUER/protocol/openid-connect/userinfo" | jq .

.. code-block:: json

   {
     "sub": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
     "email_verified": true,
     "name": "Jean Dupont",
     "preferred_username": "jdupont",
     "given_name": "Jean",
     "family_name": "Dupont",
     "email": "jean.dupont@example.org",
     "groups": [
       "/applications/geonature-local",
       "/organismes/rn-test",
       "/geonature/test/Grp_admin"
     ]
   }

Les quatre points à cocher :

* ``groups`` est présent dans **userinfo**, pas seulement dans le JWT ;
* les valeurs sont en **chemin complet**, commençant par ``/`` ;
* tous les groupes attendus de l'utilisateur sont listés ;
* ``preferred_username``, ``email``, ``given_name`` et ``family_name`` sont renseignés.

Créer les trois clients
=======================

.. list-table::
   :header-rows: 1
   :widths: 22 78

   * - Client
     - Usage
   * - ``geonature-local``
     - Connexion des utilisateurs web. Confidential, standard flow, secret côté serveur. Porte
       le rôle ``access``.
   * - ``geonature-sync``
     - Lecture technique des groupes via l'API admin. Service account, sans flow navigateur.
   * - ``occtax-mobile``
     - Application mobile. Public, PKCE obligatoire, redirection sur schéma natif, aucun secret.

.. NOTE::

   Pourquoi séparer ``geonature-sync`` ? Parce que lire l'API d'administration demande des
   droits que l'on ne veut jamais donner au client qui authentifie les utilisateurs. Un secret
   compromis côté web ne donne alors aucun accès à l'annuaire.

Le client web ``geonature-local``
---------------------------------

*Clients* → *Create client* → *OpenID Connect*, Client ID ``geonature-local``.

**Capability config**

.. list-table::
   :header-rows: 1
   :widths: 45 15 40

   * - Paramètre
     - Valeur
     - Notes
   * - Client authentication
     - **ON**
     - Client confidential, donc ``CLIENT_SECRET`` requis côté GeoNature
   * - Standard flow
     - **ON**
     - Authorization Code Flow
   * - Direct access grants
     - OFF
     - Pas de login/mot de passe direct sur ``/token``
   * - Implicit flow
     - OFF
     - Déprécié
   * - Service accounts roles
     - OFF
     - Réservé à ``geonature-sync``
   * - Device Authorization Grant / CIBA
     - OFF
     -

**Settings**

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - Champ
     - Valeur (exemple local)
   * - Root URL / Home URL
     - ``http://localhost:4200``
   * - Valid redirect URIs
     - ``http://localhost:8000/api/auth/authorize/keycloak``
   * - Valid post logout redirect URIs
     - ``http://localhost:4200/*``
   * - Web origins
     - ``http://localhost:4200``
   * - Admin URL
     - vide

.. IMPORTANT::

   La redirect URI se déduit **mécaniquement** de la configuration GeoNature :
   ``{API_ENDPOINT}/auth/authorize/{id_provider}``. Avec ``API_ENDPOINT = 'http://localhost:8000/api'``
   et ``id_provider = "keycloak"``, cela donne
   ``http://localhost:8000/api/auth/authorize/keycloak``. Pas de joker approximatif : une URI
   trop large est une faille, une URI fausse donne ``Invalid parameter: redirect_uri``.

**Advanced** : signature des tokens en RS256, *Proof Key for Code Exchange Code Challenge
Method* = ``S256``, *Always use PKCE* = OFF pour un client confidential (GeoNature envoie de
toute façon le challenge, et ``CODE_CHALLENGE_METHOD`` du TOML doit valoir ``S256``).

**Credentials** : *Client Authenticator* = *Client Id and Secret* ; recopier le secret dans
``CLIENT_SECRET``. Tout secret utilisé pendant la mise au point doit être régénéré avant
l'ouverture aux utilisateurs.

**Roles** : créer un rôle client nommé ``access``.

Requête réellement émise par GeoNature au début du flow :

.. code-block:: text

   GET {ISSUER}/protocol/openid-connect/auth
     ?response_type=code
     &client_id=geonature-local
     &redirect_uri=http://localhost:8000/api/auth/authorize/keycloak
     &scope=openid+email+profile
     &state=…
     &code_challenge=…
     &code_challenge_method=S256

Le client service ``geonature-sync``
------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 45 55

   * - Paramètre
     - Valeur
   * - Client authentication
     - **ON**
   * - Service accounts roles
     - **ON**
   * - Standard flow / Direct access grants
     - OFF
   * - Valid redirect URIs / Web origins
     - vides

*Service account roles* → filtrer sur ``realm-management`` → assigner **``query-groups``**.
C'est le droit minimum, et il suffit (``view-users`` peut être ajouté pour du débogage).

Ce que GeoNature appelle avec ce client :

.. code-block:: text

   # 1 · jeton technique
   POST {ISSUER}/protocol/openid-connect/token
     grant_type=client_credentials&client_id=geonature-sync&client_secret=…

   # 2 · lecture du groupe, avec repli sur la recherche
   GET {HOST}/admin/realms/{REALM}/group-by-path/organismes/rn-test
   GET {HOST}/admin/realms/{REALM}/groups?search=rn-test&briefRepresentation=false&max=200

L'URL de base admin est dérivée de l'``ISSUER`` en remplaçant ``/realms/`` par
``/admin/realms/``.

.. WARNING::

   Sans ``query-groups``, la lecture échoue **silencieusement** côté utilisateur : la connexion
   réussit, l'organisme n'est pas résolu, et seul un warning apparaît dans les logs du backend.

Le client mobile ``occtax-mobile``
----------------------------------

.. list-table::
   :header-rows: 1
   :widths: 45 55

   * - Paramètre
     - Valeur
   * - Client authentication
     - **OFF** (client public)
   * - Standard flow
     - ON
   * - Direct access grants
     - OFF
   * - Valid redirect URIs
     - ``fr.geonature.occtax2://auth/callback``
   * - Web origins
     - vide (application native)
   * - Advanced → Always use PKCE
     - **ON**

Aucun ``CLIENT_SECRET`` côté mobile. Les client scopes sont les mêmes que pour le web. Si le
script de contrôle d'accès s'applique aussi au mobile, créer le rôle ``access`` sur ce client
et mapper le groupe ``/applications/occtax-mobile`` dessus.

Créer les utilisateurs
======================

*Users* → *Add user*.

.. list-table::
   :header-rows: 1
   :widths: 30 35 35

   * - Champ Keycloak
     - Colonne GeoNature
     - Obligatoire
   * - Username
     - ``t_roles.identifiant`` (via ``preferred_username``)
     - oui
   * - Email
     - ``t_roles.email``
     - oui
   * - First name
     - ``t_roles.prenom_role`` (via ``given_name``)
     - oui
   * - Last name
     - ``t_roles.nom_role`` (via ``family_name``)
     - oui
   * - Enabled
     - condition de connexion
     - oui

.. WARNING::

   Un prénom ou un nom vide fait échouer la création du rôle GeoNature : le provider lit
   ``user_info["given_name"]`` sans valeur de repli.

Onglet *Groups* → *Join Group* : rattacher l'utilisateur à au moins
``/applications/geonature-local`` et à son groupe ``/organismes/…``. Onglet *Credentials* :
définir un mot de passe, *Temporary* = OFF pour un compte de test.

Contrôler qui a le droit d'entrer
=================================

Le realm authentifie tout le monde, mais GeoNature ne concerne que certains. Sans garde-fou,
n'importe quel compte du realm se connecte : le provider crée un ``t_roles``, l'associe à un
organisme et au groupe de réconciliation par défaut, et l'on se retrouve avec des comptes
GeoNature créés par accident, à nettoyer à la main.

Avec le rôle ``access``, Keycloak refuse la connexion **avant** de délivrer le code : GeoNature
n'est jamais appelé, aucune ligne n'est créée en base. Le même mécanisme protège toutes les
applications du realm, avec un rôle ``access`` par client.

Câbler le droit d'entrée
------------------------

#. **Créer le rôle** : *Clients* → ``geonature-local`` → *Roles* → *Create role* → ``access``
#. **Créer le groupe** : *Groups* → *Create group* → ``/applications/geonature-local``
#. **Lier les deux** : *Groups* → le groupe → *Role mapping* → *Assign role*, filtrer par client
   → ``geonature-local:access``

Keycloak n'a pas de case « autoriser tout le monde sur ce client ». Trois approches possibles :
un groupe parent ``/applications`` mappé vers ``access``, un rôle de realm composite, ou un
script assoupli qui ignore certains clients. La recommandation retenue est le groupe
``/applications/<client-id>`` avec ajout explicite des utilisateurs.

.. NOTE::

   Rien de tout cela n'est appliqué tant que le script ci-dessous n'est pas branché dans le
   browser flow : le rôle existe, il est attribué, mais aucune étape de connexion ne le vérifie.

Le script authenticator, livré comme un JAR
-------------------------------------------

.. code-block:: text

   kc-script-auth/
   ├── META-INF/
   │   └── keycloak-scripts.json
   └── client-access-guard.js

``META-INF/keycloak-scripts.json`` :

.. code-block:: json

   {
     "authenticators": [
       {
         "name": "Client Access Guard",
         "fileName": "client-access-guard.js",
         "description": "Require client role 'access' on current client"
       }
     ]
   }

Le champ ``name`` est celui qui apparaîtra dans *Authentication* → *Flows* → *Add execution*.
S'il n'y apparaît pas, c'est que la feature ``scripts`` est absente ou que le build n'a pas été
rejoué.

``client-access-guard.js`` :

.. code-block:: javascript

   var AuthenticationFlowError = Java.type("org.keycloak.authentication.AuthenticationFlowError");

   var REQUIRED_ROLE = "access";
   var EXCLUDED_CLIENTS = {
     "account-console": true,
     "security-admin-console": true,
     "admin-cli": true,
     "broker": true
   };

   function authenticate(context) {
     var user = context.getUser();
     if (user == null) {
       context.attempted();
       return;
     }

     var authSession = context.getAuthenticationSession();
     var client = authSession != null ? authSession.getClient() : null;
     if (client == null) {
       context.success();
       return;
     }

     var clientId = String(client.getClientId());
     if (EXCLUDED_CLIENTS[clientId]) {
       context.success();
       return;
     }

     var role = client.getRole(REQUIRED_ROLE);
     if (role != null && user.hasRole(role)) {
       context.success();
       return;
     }

     context.getEvent().error("client_role_missing");
     var challenge = context.form().setError("invalidUserMessage").createLoginUsernamePassword();
     context.failureChallenge(AuthenticationFlowError.INVALID_USER, challenge);
   }

   function action(context) {
     context.success();
   }

   function requiresUser() {
     return true;
   }

   function configuredFor(session, realm, user) {
     return true;
   }

   function setRequiredActions(session, realm, user) {
   }

   function close() {
   }

Trois points méritent l'attention :

* ``user.hasRole()`` interroge le moteur de Keycloak, pas le JWT : les rôles hérités des groupes
  comptent.
* Le fichier ne doit exposer que des **fonctions** ; un ``return`` au niveau global donne une
  ``ScriptCompilationException: Invalid return statement``.
* Le message d'erreur est volontairement générique : ne jamais révéler que le compte existe mais
  n'a pas le rôle.

Packaging et déploiement :

.. code-block:: bash

   cd ~/kc-script-auth
   jar cf client-access-guard.jar META-INF client-access-guard.js
   jar tf client-access-guard.jar          # vérifier le contenu
   sudo cp client-access-guard.jar /opt/keycloak/providers/
   sudo /opt/keycloak/bin/kc.sh build
   sudo systemctl restart keycloak

Brancher le script dans le browser flow
---------------------------------------

#. *Authentication* → *Flows* : dupliquer le flow ``browser`` en ``browser-rnf``.
#. Dans le sous-flow ``forms``, ordonner les exécutions :

   .. list-table::
      :header-rows: 1
      :widths: 60 40

      * - Exécution
        - Requirement
      * - Username Password Form
        - REQUIRED
      * - Client Access Guard
        - REQUIRED
      * - Browser - Conditional 2FA
        - CONDITIONAL

#. *Authentication* → *Bindings* → *Browser Flow* = ``browser-rnf``.

Le message affiché à l'utilisateur refusé se règle dans le thème de login, fichier
``messages/messages_fr.properties`` :

.. code-block:: properties

   invalidUserMessage=Nom d'utilisateur ou mot de passe invalide ou accès non autorisé
   loginTitle=Se connecter au {0}
   loginTitleHtml=Se connecter au {0}

Un seul message pour trois situations — mauvais mot de passe, compte inconnu, accès refusé.
C'est volontaire : on ne donne aucune information exploitable.

Personnaliser la page de connexion
==================================

Structure du thème
------------------

.. code-block:: text

   /opt/keycloak/themes/rnf/
   └── login/
       ├── theme.properties
       ├── resources/
       │   ├── css/
       │   │   └── styles.css
       │   └── img/
       │       └── logo.png
       ├── messages/
       │   └── messages_fr.properties
       └── footer.ftl          # optionnel (lien inscription)

``theme.properties`` :

.. code-block:: properties

   parent=keycloak.v2
   styles=css/styles.css

.. WARNING::

   La clé ``styles`` **remplace** la liste des CSS du parent, elle ne s'y ajoute pas. Ne pas y
   référencer ``css/login.css`` si ce fichier n'existe pas dans votre thème : cela provoque un
   404.

``styles.css``
--------------

.. code-block:: css

   /* Fond vert institutionnel */
   body.kcBodyClass,
   .pf-v5-c-login {
     background: #00885b !important;
   }

   /* Logo (remplace le texte du header) */
   #kc-header-wrapper.pf-v5-c-brand {
     display: block;
     width: 340px;
     height: 120px;
     margin: 0 auto;
     background: url("../img/logo.png") no-repeat center center;
     background-size: contain;
   }

   #kc-header-wrapper .kc-logo-text,
   #kc-header-wrapper .kc-logo-text span {
     display: none !important;
   }

   /* Bouton connexion */
   #kc-login.pf-v5-c-button.pf-m-primary {
     background-color: #00885b !important;
     border-color: #00885b !important;
     color: #fff !important;
   }

   #kc-login.pf-v5-c-button.pf-m-primary:hover,
   #kc-login.pf-v5-c-button.pf-m-primary:focus,
   #kc-login.pf-v5-c-button.pf-m-primary:active {
     background-color: #006f4a !important;
     border-color: #006f4a !important;
   }

   /* Layout : logo au-dessus du formulaire */
   .pf-v5-c-login__container {
     display: grid;
     grid-template-areas:
       "header"
       "main" !important;
     grid-template-columns: 1fr !important;
     justify-items: center;
   }

   .pf-v5-c-login__header {
     grid-area: header;
     margin-bottom: 1rem;
   }

   .pf-v5-c-login__main {
     grid-area: main;
   }

Les classes ``pf-v5-*`` viennent de PatternFly 5, le socle graphique de ``keycloak.v2`` : elles
changent d'une version majeure de Keycloak à l'autre, à revalider lors des montées de version.

Lien d'inscription optionnel, ``footer.ftl`` :

.. code-block:: text

   <#macro content>
     <div style="margin-top: 1rem; text-align: center;">
       <a href="https://votre-domaine.fr/inscription">
         Créer un compte
       </a>
     </div>
   </#macro>

Activation : *Realm settings* → *Themes* → *Login theme* = ``rnf``. Le lien « mot de passe
oublié » s'active dans *Realm settings* → *Login* → *Forgot password*, avec le SMTP configuré.

Les pièges rencontrés
---------------------

.. list-table::
   :header-rows: 1
   :widths: 45 55

   * - Problème
     - Cause et solution
   * - CSS modifié mais pas appliqué
     - Cache gzip de Keycloak : ``sudo rm -rf /opt/keycloak/data/tmp/kc-gzip-cache``, redémarrer,
       Ctrl+F5
   * - ``styles.css`` sert une ancienne version
     - Cache navigateur ; hard refresh, ou renommer le fichier en ``styles-v2.css``
   * - Logo invisible
     - Mauvais sélecteur : viser ``#kc-header-wrapper.pf-v5-c-brand``, pas
       ``.pf-v5-c-login__main-header``
   * - ``content: url(…)`` ne charge pas l'image
     - ``content`` est invalide sur un élément normal ; utiliser ``background: url(…)``
   * - 404 sur ``css/login.css``
     - Fichier référencé dans ``theme.properties`` mais absent du thème

Configurer GeoNature
====================

Les URLs
--------

Dans ``config/geonature_config.toml``, elles doivent être cohérentes avec ce qui a été déclaré
côté Keycloak (redirect URI, web origins) :

.. code-block:: toml

   URL_APPLICATION = 'http://localhost:4200'
   API_ENDPOINT = 'http://localhost:8000/api'

Le bloc ``[AUTHENTICATION]``
----------------------------

.. code-block:: toml

   [AUTHENTICATION]
   DEFAULT_RECONCILIATION_GROUP_ID = 1

   # Toujours conserver un accès local
   [[AUTHENTICATION.PROVIDERS]]
   module = "pypnusershub.auth.providers.default.LocalProvider"
   id_provider = "local_provider"

   [[AUTHENTICATION.PROVIDERS]]
   module = "geonature.keycloak_provider.KeycloakOrganismProvider"
   id_provider = "keycloak"

   ISSUER = "https://keycloak.mon-domaine.fr/realms/si-rnf"
   CLIENT_ID = "geonature-local"
   CLIENT_SECRET = "<secret_client_geonature>"

   # Hérités de OpenIDConnectProvider
   group_claim_name = "groups"
   IDENTIFIER_FIELD = "preferred_username"
   RECONCILIATE_ATTR = "email"
   CODE_CHALLENGE_METHOD = "S256"

   # Propres au provider custom
   ORGANISM_GROUP_PREFIX = "/organismes/"
   ORGANISM_UUID_CLAIM = "uuid_organisme"
   ORGANISM_NAME_CLAIM = "organisme"
   USER_UUID_CLAIM = "sub"

   KEYCLOAK_ADMIN_CLIENT_ID = "geonature-sync"
   KEYCLOAK_ADMIN_CLIENT_SECRET = "<secret_client_geonature_sync>"
   KEYCLOAK_ADMIN_TIMEOUT = 5

   [AUTHENTICATION.PROVIDERS.group_mapping]
   "/geonature/test" = 1
   "/geonature/test/Grp_admin" = 2

.. list-table::
   :header-rows: 1
   :widths: 35 65

   * - Clé
     - Effet
   * - ``ISSUER``
     - URL du realm, sans ``/.well-known/openid-configuration`` ; sert aussi à dériver l'URL de
       l'API admin
   * - ``CLIENT_ID`` / ``CLIENT_SECRET``
     - Client OIDC web confidential
   * - ``group_claim_name``
     - Nom du claim contenant les chemins de groupes
   * - ``IDENTIFIER_FIELD``
     - Claim utilisé comme identifiant GeoNature
   * - ``RECONCILIATE_ATTR``
     - Champ de rapprochement avec un compte existant, côté classe parente
   * - ``ORGANISM_GROUP_PREFIX``
     - Préfixe qui désigne un groupe organisme parmi tous les groupes reçus
   * - ``USER_UUID_CLAIM``
     - Claim recopié dans ``t_roles.uuid_role`` ; ``sub`` par défaut
   * - ``KEYCLOAK_ADMIN_*``
     - Identifiants du service account et délai d'expiration des appels admin
   * - ``group_mapping``
     - Chemin de groupe Keycloak → ``id_role`` d'un groupe GeoNature
   * - ``DEFAULT_RECONCILIATION_GROUP_ID``
     - Groupe attribué quand aucun mapping ne s'applique

.. WARNING::

   Garder ``local_provider`` déclaré. Sans lui, le frontend redirige automatiquement vers
   Keycloak, et la moindre erreur de configuration produit une boucle de redirection dont on ne
   sort plus par l'interface. C'est aussi l'accès de secours si Keycloak tombe.

Redémarrer le backend, puis vérifier que les deux providers sont exposés :

.. code-block:: bash

   sudo systemctl restart geonature   # selon votre méthode de déploiement
   curl -s http://localhost:8000/api/auth/providers | jq .

Comment le provider est chargé
------------------------------

.. code-block:: python

   # backend/geonature/app.py
   auth_manager.init_app(app, providers_declaration=config["AUTHENTICATION"]["PROVIDERS"])

   # pypnusershub/auth/auth_manager.py
   module = importlib.import_module(import_path)
   class_ = getattr(module, class_name)
   instance_provider = class_()
   instance_provider.configure(configuration=provider_config)
   self.add_provider(instance_provider.id_provider, instance_provider)

La clé ``module`` du TOML est un chemin d'import Python : le provider peut vivre dans GeoNature,
dans un module tiers ou dans ``pypnusershub``. Aucune inscription au registre, aucun point
d'entrée setuptools — il suffit que la classe soit importable. ``id_provider`` devient le
segment d'URL des routes ``/auth/login/<id>`` et ``/auth/authorize/<id>``, et plusieurs
providers OIDC peuvent coexister avec chacun son bloc de configuration.

Écrire un provider custom revient donc à sous-classer, surcharger ``configure()`` et
``authorize()``, et changer une ligne de TOML.

Le provider ``KeycloakOrganismProvider`` en entier
==================================================

Fichier ``backend/geonature/keycloak_provider.py``. Il hérite de ``OpenIDConnectProvider``
(module ``pypnusershub``) et ajoute quatre choses :

* la résolution de l'organisme depuis le groupe ``/organismes/…`` et ses attributs, lus via
  l'API admin ;
* la création ou la mise à jour de ``bib_organismes``, puis le renseignement de
  ``t_roles.id_organisme`` ;
* la recopie du claim ``sub`` dans ``t_roles.uuid_role``, après validation du format UUID ;
* la réconciliation forcée sur ``identifiant`` plutôt que sur l'email.

Ce qu'il **ne fait pas** : aucun contrôle d'accès applicatif (c'est le rôle de Keycloak, via le
script ``Client Access Guard``), et aucune synchronisation miroir des groupes à chaque
reconnexion.

La cascade de résolution de l'organisme est à retenir : ``id_organisme`` (reprise d'un
identifiant existant), puis ``uuid_organisme`` (pivot entre instances), puis ``nom_organisme``
(dernier recours), et enfin création d'un nouvel organisme. L'appel nominal à l'API admin est
``group-by-path`` ; en cas d'échec, le code se replie sur ``groups?search=<feuille>`` puis
parcourt récursivement les sous-groupes jusqu'à retrouver le chemin exact.

.. code-block:: python

   from typing import Any, Optional, Union
   from urllib.parse import quote
   import time
   import uuid

   import requests
   import sqlalchemy as sa
   from flask import current_app, session
   from marshmallow import EXCLUDE, ValidationError, fields
   from pypnusershub.auth import ProviderConfigurationSchema, oauth
   from pypnusershub.auth.providers.openid_provider import OpenIDConnectProvider
   from pypnusershub.db import db, models


   class KeycloakOrganismProvider(OpenIDConnectProvider):
       """
       OpenID Connect provider with automatic organism reconciliation.

       Expected token/userinfo claims:
       - groups (list[str]) with entries like "/organismes/<slug-or-name>"
       - optionally a claim containing organism UUID (default: "uuid_organisme")
       - optionally a claim containing organism label (default: "organisme")
       """

       group_prefix = "/organismes/"
       organism_uuid_claim = "uuid_organisme"
       organism_name_claim = "organisme"
       user_uuid_claim = "sub"
       keycloak_issuer = None
       keycloak_admin_client_id = None
       keycloak_admin_client_secret = None
       keycloak_admin_timeout = 5
       _kc_admin_token = None
       _kc_admin_token_exp = 0

       def configure(self, configuration: Union[dict, Any]) -> None:
           super().configure(configuration)

           class KeycloakOrganismConfiguration(ProviderConfigurationSchema):
               ORGANISM_GROUP_PREFIX = fields.String(load_default="/organismes/")
               ORGANISM_UUID_CLAIM = fields.String(load_default="uuid_organisme")
               ORGANISM_NAME_CLAIM = fields.String(load_default="organisme")
               USER_UUID_CLAIM = fields.String(load_default="sub")
               KEYCLOAK_ADMIN_CLIENT_ID = fields.String(load_default=None, allow_none=True)
               KEYCLOAK_ADMIN_CLIENT_SECRET = fields.String(load_default=None, allow_none=True)
               KEYCLOAK_ADMIN_TIMEOUT = fields.Integer(load_default=5)

           try:
               conf = KeycloakOrganismConfiguration().load(configuration, unknown=EXCLUDE)
           except ValidationError as e:
               raise ValidationError(f"Error while loading Keycloak organism configuration: {e}")

           self.group_prefix = conf["ORGANISM_GROUP_PREFIX"]
           self.organism_uuid_claim = conf["ORGANISM_UUID_CLAIM"]
           self.organism_name_claim = conf["ORGANISM_NAME_CLAIM"]
           self.user_uuid_claim = conf["USER_UUID_CLAIM"]
           self.keycloak_admin_client_id = conf["KEYCLOAK_ADMIN_CLIENT_ID"]
           self.keycloak_admin_client_secret = conf["KEYCLOAK_ADMIN_CLIENT_SECRET"]
           self.keycloak_admin_timeout = conf["KEYCLOAK_ADMIN_TIMEOUT"]
           # ISSUER is required by OpenIDConnectProvider, keep it for admin API calls.
           self.keycloak_issuer = configuration.get("ISSUER")

       def _extract_first_group_organism_path(self, groups):
           if not groups:
               return None
           for group in groups:
               if isinstance(group, str) and group.startswith(self.group_prefix):
                   return group
           return None

       def _extract_first_group_organism_name(self, groups):
           group_path = self._extract_first_group_organism_path(groups)
           if not group_path:
               return None
           # Keep leaf name only: /organismes/foo/bar -> bar
           return group_path.rstrip("/").split("/")[-1] or None

       def _get_kc_admin_base(self) -> Optional[str]:
           if not self.keycloak_issuer or "/realms/" not in self.keycloak_issuer:
               return None
           host, realm = self.keycloak_issuer.split("/realms/", 1)
           return f"{host}/admin/realms/{realm}"

       def _get_kc_admin_token(self) -> Optional[str]:
           if not (
               self.keycloak_issuer
               and self.keycloak_admin_client_id
               and self.keycloak_admin_client_secret
           ):
               return None
           if self._kc_admin_token and time.time() < self._kc_admin_token_exp:
               return self._kc_admin_token

           token_url = f"{self.keycloak_issuer}/protocol/openid-connect/token"
           resp = requests.post(
               token_url,
               data={
                   "grant_type": "client_credentials",
                   "client_id": self.keycloak_admin_client_id,
                   "client_secret": self.keycloak_admin_client_secret,
               },
               timeout=self.keycloak_admin_timeout,
           )
           if not resp.ok:
               current_app.logger.warning(
                   "Keycloak admin token request failed: %s - %s",
                   resp.status_code,
                   resp.text[:200],
               )
               return None
           payload = resp.json()
           self._kc_admin_token = payload.get("access_token")
           self._kc_admin_token_exp = time.time() + max(payload.get("expires_in", 60) - 10, 10)
           return self._kc_admin_token

       def _get_group_attributes_from_keycloak(self, group_path):
           admin_base = self._get_kc_admin_base()
           admin_token = self._get_kc_admin_token()
           if not admin_base or not admin_token or not group_path:
               return None

           # Some Keycloak setups expect "/" to remain unescaped in group-by-path.
           url = f"{admin_base}/group-by-path/{quote(group_path, safe='/')}"
           resp = requests.get(
               url,
               headers={"Authorization": f"Bearer {admin_token}"},
               timeout=self.keycloak_admin_timeout,
           )
           if resp.ok:
               return resp.json()

           # Fallback: use search endpoint then match exact path recursively.
           leaf_name = group_path.rstrip("/").split("/")[-1]
           search_url = (
               f"{admin_base}/groups?search={quote(leaf_name, safe='')}"
               "&briefRepresentation=false&max=200"
           )
           search_resp = requests.get(
               search_url,
               headers={"Authorization": f"Bearer {admin_token}"},
               timeout=self.keycloak_admin_timeout,
           )
           if search_resp.ok:
               groups = search_resp.json()

               def walk(items):
                   for item in items or []:
                       if item.get("path") == group_path:
                           return item
                       found = walk(item.get("subGroups") or [])
                       if found:
                           return found
                   return None

               found_group = walk(groups)
               if found_group:
                   return found_group

           # Keep warning logs for diagnostics.
           if not resp.ok:
               current_app.logger.warning(
                   "Keycloak group-by-path failed for %s: %s - %s",
                   group_path,
                   resp.status_code,
                   resp.text[:200],
               )
           if "search_resp" in locals() and not search_resp.ok:
               current_app.logger.warning(
                   "Keycloak groups search failed for %s: %s - %s",
                   leaf_name,
                   search_resp.status_code,
                   search_resp.text[:200],
               )
           return None

       def _resolve_organism(self, user_info, source_groups):
           org_id = None
           org_uuid = user_info.get(self.organism_uuid_claim)
           org_name = user_info.get(self.organism_name_claim)

           if not org_uuid or not org_name:
               group_path = self._extract_first_group_organism_path(source_groups)
               group_obj = self._get_group_attributes_from_keycloak(group_path)
               if group_obj:
                   group_attrs = group_obj.get("attributes") or {}
                   id_values = group_attrs.get("id_organisme") or []
                   if id_values:
                       try:
                           org_id = int(id_values[0])
                       except (TypeError, ValueError):
                           current_app.logger.warning(
                               "Invalid id_organisme value on group %s: %s",
                               group_obj.get("path"),
                               id_values[0],
                           )
                   if not org_uuid:
                       uuid_values = group_attrs.get("uuid_organisme") or []
                       if uuid_values:
                           org_uuid = uuid_values[0]
                   if not org_name:
                       name_values = group_attrs.get("nom_organisme") or []
                       org_name = name_values[0] if name_values else group_obj.get("name")

           # Fallback to group leaf if no nom_organisme is provided.
           org_name = org_name or self._extract_first_group_organism_name(source_groups)

           # Nothing to reconcile.
           if not org_uuid and not org_name:
               return None

           organism = None
           if org_id:
               organism = db.session.execute(
                   sa.select(models.Organisme).where(models.Organisme.id_organisme == org_id)
               ).scalar_one_or_none()
           if org_uuid:
               organism_by_uuid = db.session.execute(
                   sa.select(models.Organisme).where(models.Organisme.uuid_organisme == org_uuid)
               ).scalar_one_or_none()
               if (
                   organism
                   and organism_by_uuid
                   and organism.id_organisme != organism_by_uuid.id_organisme
               ):
                   current_app.logger.warning(
                       "Organism mismatch between id_organisme=%s and uuid_organisme=%s",
                       org_id,
                       org_uuid,
                   )
               if not organism:
                   organism = organism_by_uuid
           if not organism and org_name:
               organism = db.session.execute(
                   sa.select(models.Organisme).where(models.Organisme.nom_organisme == org_name)
               ).scalar_one_or_none()

           if not organism:
               organism = models.Organisme(nom_organisme=org_name or str(org_uuid))
               if org_id:
                   # Keep upstream identifier when available (migration-friendly).
                   organism.id_organisme = org_id
               if org_uuid:
                   organism.uuid_organisme = org_uuid
               db.session.add(organism)
               db.session.flush()
               return organism

           updated = False
           if org_id and organism.id_organisme != org_id:
               # id_organisme is the local PK, do not overwrite an existing row identity.
               current_app.logger.warning(
                   "Ignoring id_organisme=%s for existing organism id=%s",
                   org_id,
                   organism.id_organisme,
               )
           if org_uuid and organism.uuid_organisme != org_uuid:
               organism.uuid_organisme = org_uuid
               updated = True
           if org_name and organism.nom_organisme != org_name:
               organism.nom_organisme = org_name
               updated = True
           if updated:
               db.session.flush()
           return organism

       def authorize(self):
           oauth_provider = getattr(oauth, self.id_provider)
           token = oauth_provider.authorize_access_token()
           session["openid_token_resp"] = token

           user_info = token["userinfo"]
           source_groups = (
               user_info[self.group_claim_name] if self.group_claim_name in user_info else []
           )

           organism = self._resolve_organism(user_info, source_groups)
           keycloak_user_uuid = None
           uuid_claim_value = user_info.get(self.user_uuid_claim)
           if uuid_claim_value:
               try:
                   keycloak_user_uuid = str(uuid.UUID(str(uuid_claim_value)))
               except (ValueError, TypeError):
                   current_app.logger.warning(
                       "Invalid user UUID claim '%s' value: %s",
                       self.user_uuid_claim,
                       uuid_claim_value,
                   )
           new_user = {
               "identifiant": user_info[self.identifier_field],
               "email": user_info["email"],
               "prenom_role": user_info["given_name"],
               "nom_role": user_info["family_name"],
               "active": True,
           }
           if keycloak_user_uuid:
               new_user["uuid_role"] = keycloak_user_uuid
           if organism:
               new_user["id_organisme"] = organism.id_organisme

           user = self.insert_or_update_role(
               new_user, source_groups=source_groups, reconciliate_attr="identifiant"
           )
           db.session.commit()
           return user

Les flux, côté GeoNature
========================

Flux web (navigateur)
---------------------

.. list-table::
   :header-rows: 1
   :widths: 40 15 45

   * - Route
     - Méthode
     - Rôle
   * - ``/api/auth/providers``
     - GET
     - Liste des providers, lue par le frontend
   * - ``/api/auth/login/keycloak``
     - GET/POST
     - Démarre le flux OIDC (redirection vers Keycloak)
   * - ``/api/auth/authorize/keycloak``
     - GET
     - Callback OIDC, réconciliation, création de la session

La séquence complète :

#. L'utilisateur clique « Se connecter avec Keycloak ».
#. GeoNature redirige vers l'endpoint ``authorize`` de Keycloak.
#. Keycloak authentifie et exécute ``Client Access Guard``.
#. Si c'est accepté, retour sur ``/api/auth/authorize/keycloak?code=…``.
#. ``KeycloakOrganismProvider.authorize()`` échange le code contre des tokens, lit ``userinfo``,
   résout l'organisme, crée ou met à jour l'utilisateur, applique ``group_mapping`` à la
   création, puis commit.
#. ``login_user()`` de Flask-Login, et redirection vers ``URL_APPLICATION``.

Flux mobile (PKCE)
------------------

.. code-block:: text

   POST /api/auth/mobile/keycloak

Implémenté dans ``pypnusershub/routes.py``. Requête :

.. code-block:: json

   {
     "provider_id": "keycloak",
     "code": "AUTHORIZATION_CODE_FROM_KEYCLOAK",
     "code_verifier": "PKCE_CODE_VERIFIER",
     "redirect_uri": "fr.geonature.occtax2://auth/callback",
     "id_application": 3
   }

Réponse en cas de succès :

.. code-block:: json

   {
     "user": {
       "id_role": 123,
       "nom_role": "Dupont",
       "prenom_role": "Jean",
       "identifiant": "jdupont",
       "id_organisme": 45,
       "id_application": 3
     },
     "token": "JWT_GEONATURE",
     "expires": "2026-04-08T14:22:11+00:00"
   }

.. list-table::
   :header-rows: 1
   :widths: 12 30 58

   * - Code
     - Type
     - Cas
   * - 400
     - ``invalid_request``
     - Champ manquant, ``redirect_uri`` invalide
   * - 401
     - ``invalid_grant``
     - Code PKCE invalide ou expiré
   * - 403
     - ``forbidden``
     - Utilisateur sans droit sur ``id_application``
   * - 409
     - ``reconciliation_error``
     - Conflit d'organisme
   * - 500
     - ``server_error``
     - Erreur technique

Côté application, fichier ``backend/media/mobile/occtax/settings.json`` :

.. code-block:: json

   {
     "auth_mode": "keycloak",
     "keycloak": {
       "provider_id": "keycloak",
       "login_path": "api/auth/login/{provider_id}",
       "redirect_uri": "fr.geonature.occtax2://auth/callback",
       "mobile_login_path": "api/auth/mobile/keycloak"
     }
   }

Une liste blanche de redirect URIs peut être déclarée sur le provider dans le TOML, via
``MOBILE_REDIRECT_URIS`` ou ``VALID_REDIRECT_URIS``.

Des groupes Keycloak vers les groupes GeoNature
-----------------------------------------------

La clé de ``group_mapping`` est le chemin exact tel qu'il apparaît dans ``userinfo.groups`` ; la
valeur est l'``id_role`` d'un **groupe** GeoNature, c'est-à-dire une ligne de ``t_roles`` avec
``groupe = true``.

.. list-table::
   :header-rows: 1
   :widths: 45 55

   * - Situation
     - Résultat
   * - Nouvel utilisateur, mapping trouvé
     - Groupes GeoNature assignés à la création
   * - Nouvel utilisateur, aucun mapping
     - ``DEFAULT_RECONCILIATION_GROUP_ID``
   * - Utilisateur déjà existant
     - Groupes **non resynchronisés**

.. WARNING::

   Retirer un utilisateur d'un groupe Keycloak ne lui retire pas son groupe GeoNature. Une
   évolution « miroir strict » (ajout et retrait à chaque connexion) est possible dans
   ``insert_or_update_role`` du sous-module ``UsersHub-authentification-module``, mais ce n'est
   pas le comportement par défaut. Pour tester un mapping, supprimer l'utilisateur GeoNature
   puis se reconnecter : la logique ne s'applique qu'à la création.

Vérifier après le déploiement
=============================

Côté Keycloak
-------------

* La feature ``scripts`` est active au démarrage : ``Preview features enabled: … scripts:v1``
  dans les logs.
* ``Client Access Guard`` est visible dans *Authentication* → *Flows* → *Add execution*.
* Le *Browser Flow* du realm est bien ``browser-rnf``.
* Le mapper ``groups`` apparaît dans la réponse ``userinfo``.
* Le rôle ``access`` existe sur ``geonature-local``, et l'utilisateur de test appartient à
  ``/applications/geonature-local``.

Côté GeoNature
--------------

* ``GET /api/auth/providers`` retourne ``keycloak`` **et** ``local_provider``.
* La connexion d'un utilisateur autorisé aboutit à une session valide.
* La connexion d'un utilisateur non autorisé affiche le message générique de Keycloak.
* ``uuid_role`` et ``id_organisme`` sont renseignés en base.

Les requêtes SQL de contrôle
----------------------------

.. code-block:: sql

   -- Utilisateur
   SELECT id_role, identifiant, uuid_role, id_organisme, active
   FROM utilisateurs.t_roles
   WHERE identifiant = '<login_test>';

   -- Organisme résolu
   SELECT id_organisme, uuid_organisme, nom_organisme
   FROM utilisateurs.bib_organismes
   WHERE id_organisme = <id_attendu>;

   -- Droits sur l'application
   SELECT *
   FROM utilisateurs.v_userslist_forall_applications
   WHERE identifiant = '<login_test>';

   -- Groupes GeoNature affectés
   SELECT r.identifiant, g.id_role AS groupe_id
   FROM utilisateurs.t_roles r
   LEFT JOIN utilisateurs.cor_roles cr ON cr.id_role_utilisateur = r.id_role
   LEFT JOIN utilisateurs.t_roles g ON g.id_role = cr.id_role_groupe
   WHERE r.identifiant = '<login_test>';

Si des ``id_organisme`` explicites sont injectés depuis Keycloak, resynchroniser la séquence,
sinon la prochaine insertion locale entrera en collision :

.. code-block:: sql

   SELECT setval(
     pg_get_serial_sequence('utilisateurs.bib_organismes', 'id_organisme'),
     (SELECT COALESCE(MAX(id_organisme), 1) FROM utilisateurs.bib_organismes),
     true
   );

Dépannage
=========

Côté Keycloak
-------------

.. list-table::
   :header-rows: 1
   :widths: 35 30 35

   * - Symptôme
     - Diagnostic
     - Action
   * - ``Invalid parameter: redirect_uri``
     - URI non identique
     - Aligner exactement la redirect URI du client et le callback GeoNature
   * - ``MismatchingStateError``, boucle de login
     - Cookies perdus, deux hostnames
     - Un seul hostname, vider les cookies, redémarrer
   * - ``Client Access Guard`` absent
     - Feature ``scripts`` off, ou pas de build
     - ``features=scripts``, ``kc.sh build``, redémarrage
   * - ``ScriptCompilationException: Invalid return statement``
     - ``return`` global dans le script
     - Tout mettre dans des fonctions
   * - ``A provider JAR was updated``
     - JAR ajouté sans rebuild
     - ``kc.sh build`` puis redémarrage
   * - ``ReadOnlyFileSystemException`` au build
     - Droits insuffisants
     - Lancer le build avec ``sudo``
   * - Message générique alors que l'utilisateur a les droits
     - Rôle ``access`` non évalué
     - Vérifier le role mapping du groupe ``/applications/…``

Côté claims et groupes
----------------------

.. list-table::
   :header-rows: 1
   :widths: 35 30 35

   * - Symptôme
     - Cause probable
     - Correction
   * - ``groups`` absent de userinfo
     - Mapper absent ou *Add to userinfo* OFF
     - Corriger le mapper
   * - ``groups: ["rn-test"]`` sans le ``/``
     - *Full group path* OFF
     - Activer *Full group path*
   * - ``groups`` vide
     - Utilisateur membre d'aucun groupe
     - *Join Group* sur l'utilisateur
   * - Mapper créé sur le client mais inactif
     - Scope non assigné en Default
     - Poser le mapper sur un scope Default du client
   * - ``preferred_username`` absent
     - Scope ``profile`` non assigné
     - Client scopes → Default → ``profile``
   * - ``given_name`` / ``family_name`` vides
     - Champs vides côté utilisateur
     - Renseigner First name et Last name

Côté GeoNature
--------------

.. list-table::
   :header-rows: 1
   :widths: 35 30 35

   * - Symptôme
     - Cause probable
     - Correction
   * - Organisme non créé
     - Aucun groupe ``/organismes/`` dans userinfo
     - Rattacher l'utilisateur au groupe
   * - ``group path does not exist`` dans les logs
     - Service account sans droits
     - Ajouter ``query-groups`` à ``geonature-sync``
   * - ``uuid_role`` vide
     - Claim ``sub`` absent ou format invalide
     - Vérifier ``USER_UUID_CLAIM``
   * - Groupes GeoNature non affectés
     - Utilisateur déjà existant
     - Recréer le compte, ou affecter les groupes à la main
   * - Mobile : 403 ``forbidden``
     - Pas de droit sur ``id_application``
     - Vérifier ``cor_role_app_profil`` et la vue
       ``v_userslist_forall_applications``

Sécurité
========

* **Secrets** — rotation de tous les ``CLIENT_SECRET`` utilisés pendant la mise au point, avant
  l'ouverture aux utilisateurs.
* **TLS de bout en bout** — Keycloak, l'API et le frontend.
* **Journaux** — ne jamais écrire un token, un ``code``, un ``code_verifier`` ou un secret en
  clair.
* **Moindre privilège** — ``geonature-sync`` ne détient que ``query-groups``, en lecture seule.
* **Redirect URIs** — liste blanche stricte, web comme mobile ; pas de joker sur un domaine
  entier.
* **Messages d'erreur** — un seul libellé générique à la connexion.
* **Mobile** — client public et PKCE obligatoire, jamais de secret embarqué dans l'application.
* **Sauvegarde** — base de données sauvegardée avant la mise en production.
* **Accès de secours** — conserver ``local_provider`` et un compte administrateur local.

Checklist de déploiement sur un nouvel environnement
====================================================

Côté Keycloak :

#. Installer le serveur, la base et le reverse proxy TLS.
#. Activer ``features=preview,scripts``, puis ``kc.sh build``.
#. Créer le realm et ses réglages (login, tokens, localisation, brute force).
#. Créer les clients ``geonature-local``, ``geonature-sync`` et mobile.
#. Créer le rôle ``access`` et les groupes ``/applications/…``, puis le role mapping.
#. Configurer le mapper ``groups`` (full path ON, userinfo ON).
#. Créer les groupes ``/organismes/…`` et leurs attributs.
#. Déployer le JAR ``client-access-guard.jar`` et basculer le browser flow.
#. Déployer le thème de login.

Côté GeoNature :

#. Sauvegarder la base de données.
#. Déposer ``keycloak_provider.py`` et renseigner le bloc ``[AUTHENTICATION]``.
#. Déclarer le ``group_mapping`` et créer les groupes GeoNature cibles.
#. Redémarrer le backend et vérifier ``GET /api/auth/providers``.
#. Tester un utilisateur autorisé, puis un utilisateur non autorisé, puis le mobile.
#. Contrôler ``uuid_role`` et ``id_organisme`` en base.

Pour aller plus loin
====================

* :doc:`keycloak` — la présentation de l'atelier et son support.
* `Keycloak — Working with themes <https://www.keycloak.org/ui-customization/themes>`_
* `Keycloak — JavaScript providers <https://www.keycloak.org/docs/latest/server_development/#_script_providers>`_
* Documentation du dépôt GeoNature : ``docs/KEYCLOAK_GEONATURE.md`` (guide exhaustif),
  ``DEPLOYMENT_KEYCLOAK.md`` (note de déploiement),
  ``backend/geonature/keycloak_provider.py`` (code du provider).
