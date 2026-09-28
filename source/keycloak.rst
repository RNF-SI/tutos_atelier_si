============================================================
Keycloak × GeoNature : mettre en place un SSO OpenID Connect
============================================================

.. contents:: Table des matières
   :local:
   :depth: 2

Mettre en place un serveur d'identités Keycloak et y brancher GeoNature via un provider
d'authentification personnalisé, ``KeycloakOrganismProvider``, qui résout l'organisme de
l'utilisateur et alimente le schéma ``utilisateurs`` de la base.

.. container:: info-box

   **L'idée directrice**

   Keycloak répond à « qui es-tu ? ». GeoNature reste seul à répondre à « qu'as-tu le droit
   de faire ? ». Le modèle de droits métier (CRUVED, profils par application, portée des
   données) n'est pas modifié.

Pourquoi Keycloak
=================

UsersHub porte très bien le modèle de données métier (``t_roles``, ``bib_organismes``,
``cor_roles``, profils par application) et l'authentification locale via ``pypnusershub``.
En revanche il n'offre pas de SSO au-delà de l'écosystème PnX, pas de MFA, pas de
fédération LDAP / Active Directory / FranceConnect, pas d'OAuth2 exploitable par une
application mobile, ni délégation d'administration ou journal d'audit des sessions.

Keycloak (projet open source Red Hat / CNCF) est un serveur d'identités, pas une base
d'utilisateurs de plus : il expose les identités via OpenID Connect, OAuth 2.0 et SAML 2.0,
et les applications ne voient jamais le mot de passe.

Le vocabulaire
--------------

.. list-table::
   :header-rows: 1
   :widths: 20 45 35

   * - Objet Keycloak
     - Ce que c'est
     - Dans notre installation
   * - **Realm**
     - Un espace d'identités étanche : ses utilisateurs, ses clés, ses politiques
     - Un realm par système d'information
   * - **Client**
     - Une application qui délègue son authentification au realm
     - ``geonature-local``, ``geonature-sync``, le client mobile
   * - **Client scope**
     - Un paquet de mappers, donc de claims, attaché à un client
     - ``openid``, ``profile``, ``email``, ``roles``
   * - **Mapper**
     - Une règle qui écrit un claim dans le token ou dans userinfo
     - Le mapper *Group Membership* claim ``groups``
   * - **Group**
     - Un ensemble d'utilisateurs, hiérarchique, porteur d'attributs
     - ``/organismes/…``, ``/applications/…``, ``/geonature/…``
   * - **Role**
     - Une permission nommée, de realm ou de client
     - Le rôle client ``access``
   * - **Flow**
     - La suite d'étapes exécutées pendant une connexion
     - ``browser-rnf``, avec *Client Access Guard*

Le flux OIDC (Authorization Code Flow + PKCE)
---------------------------------------------

#. **Redirection** — l'application envoie l'utilisateur chez Keycloak
   (``GET /protocol/openid-connect/auth?response_type=code&code_challenge_method=S256``).
#. **Authentification** — Keycloak vérifie l'identité, l'application ne voit rien.
#. **Code d'autorisation** — retour sur la redirect URI avec un code à usage unique.
#. **Échange** — le backend échange le code contre des tokens (``POST /token``).
#. **Profil** — le backend lit le profil sur ``GET /userinfo`` (``sub``, ``email``, ``groups``…).
#. **Session locale** — GeoNature crée sa propre session et son JWT. C'est ici qu'intervient
   le provider custom.

Architecture cible
==================

Trois clients Keycloak
----------------------

.. list-table::
   :header-rows: 1
   :widths: 22 78

   * - Client
     - Usage
   * - ``geonature-local``
     - Connexion des utilisateurs web. Client *confidential*, standard flow activé, redirect
       vers le backend, secret stocké côté serveur. C'est lui qui porte le rôle ``access``.
   * - ``geonature-sync``
     - Lecture technique des groupes. Client *service account*, sans flow navigateur. Sert
       uniquement à appeler l'API admin pour lire les attributs des groupes organisme.
   * - ``occtax-mobile``
     - Application mobile. Client *public*, PKCE obligatoire, redirection sur un schéma d'URL
       natif. Aucun secret embarqué dans l'APK.

.. NOTE::

   Pourquoi séparer ``geonature-sync`` ? Lire l'API d'administration demande des droits que
   l'on ne veut jamais donner au client qui authentifie les utilisateurs. Un secret compromis
   côté web ne donne alors aucun accès à l'annuaire.

Une arborescence de groupes, quatre intentions
----------------------------------------------

* ``/applications/…`` — droit d'entrée. Le groupe porte le rôle client ``access``.
* ``/organismes/…`` — organisme de rattachement. Porte les attributs lus par le provider.
* ``/reserves/…`` — contexte métier réserve, réservé aux usages à venir.
* ``/geonature/…`` — clés de ``group_mapping`` vers les groupes GeoNature.

.. IMPORTANT::

   **GeoNature lit les groupes dans userinfo, pas dans le JWT.** Seul l'endpoint ``/userinfo``,
   appelé par Authlib après l'échange du code, est exploité ; l'access token, l'ID token,
   ``realm_access.roles`` et ``resource_access`` sont ignorés par le code.

   Conséquence pratique : sur le mapper *Group Membership*, **Add to userinfo** doit être
   activé. Sans lui, le token contient bien les groupes, l'organisme n'est jamais résolu, et
   rien n'apparaît dans les logs.

Du claim OIDC à la colonne PostgreSQL
--------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 25 40 35

   * - Claim userinfo
     - Destination GeoNature
     - Remarque
   * - ``sub``
     - ``utilisateurs.t_roles.uuid_role``
     - UUID stable de l'utilisateur Keycloak
   * - ``preferred_username``
     - ``t_roles.identifiant``
     - Réglé par ``IDENTIFIER_FIELD``
   * - ``email``
     - ``t_roles.email``
     - Sert aussi de clé de réconciliation possible
   * - ``given_name`` / ``family_name``
     - ``t_roles.prenom_role`` / ``nom_role``
     - Champs obligatoires côté Keycloak
   * - ``groups``
     - ``t_roles.id_organisme``, ``cor_roles``
     - Via le préfixe organisme et ``group_mapping``
   * - Attributs de groupe
     - ``utilisateurs.bib_organismes``
     - Lus par l'API admin, pas par le token

Configurer Keycloak
===================

Étape 0 · préparer le serveur
------------------------------

Activer la feature ``scripts`` dans ``/opt/keycloak/conf/keycloak.conf``, nécessaire au
script authenticator décrit plus bas :

.. code-block:: ini

   features=preview,scripts

Après tout ajout de provider, rejouer le build :

.. code-block:: bash

   sudo systemctl stop keycloak
   sudo /opt/keycloak/bin/kc.sh build
   sudo systemctl start keycloak

.. WARNING::

   Sans ``build``, le JAR n'est pas chargé et Keycloak loggue seulement
   ``A provider JAR was updated since the last build, please rebuild``.

Étape 1 · les réglages de realm qui comptent
---------------------------------------------

* **Login** : *User registration* OFF en production, *Forgot password* ON, *Login with email* ON,
  *Edit username* OFF pour garder un ``preferred_username`` stable.
* **Tokens et sessions** : signature RS256, access token 5 à 15 min, SSO idle 30 min / max 10 h,
  *Revoke refresh token* ON.
* **Security defenses** : *Brute force detection* ON.
* **Localization** : *Internationalization* ON, locale par défaut ``fr``.

L'URL du realm est l'``ISSUER`` que GeoNature mettra dans son TOML, par exemple
``https://keycloak.example.org/realms/si-rnf``.

Étape 2 · groupes et attributs d'organisme
-------------------------------------------

Sur chaque groupe organisme, onglet *Attributes* :

.. list-table::
   :header-rows: 1
   :widths: 25 30 45

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

.. NOTE::

   Dans Keycloak, un attribut de groupe est toujours une **liste de chaînes**. Le provider lit
   ``attributes["id_organisme"][0]`` et convertit lui-même en entier. Ces attributs ne sont
   jamais exposés dans le token de l'utilisateur : seule l'API admin les rend lisibles, d'où le
   client ``geonature-sync``.

Étape 3 · les client scopes
----------------------------

Keycloak assemble le token à partir des client scopes attachés au client. Un claim manquant,
c'est presque toujours un scope non assigné ou un mapper absent. À mettre en **Default** sur
le client : ``openid`` (``sub``, ``iss``, ``aud``, ``exp``), ``profile``
(``preferred_username``, ``given_name``, ``family_name``), ``email``, ``roles`` (et notre
mapper ``groups``), ``web-origins``.

.. WARNING::

   Un scope en *Optional* n'est appliqué que si le client le demande explicitement. GeoNature
   demande ``openid email profile`` et rien d'autre, codé en dur dans
   ``OpenIDProvider.configure()`` : tout scope utile doit donc être en **Default**.

Étape 4 · le mapper Group Membership
-------------------------------------

*Client scopes* → ``roles`` → *Mappers* → *Add mapper* → *By configuration* → *Group Membership*

.. list-table::
   :header-rows: 1
   :widths: 30 15 55

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
     - ON
     - Donne ``/organismes/rn-test`` et non ``rn-test`` : indispensable au préfixe et au mapping
   * - Add to userinfo
     - ON
     - Obligatoire : c'est la seule source lue par GeoNature
   * - Add to ID token
     - ON
     - Recommandé, pour déboguer
   * - Add to access token
     - ON
     - Recommandé, pour déboguer

Ce mapper natif n'offre aucun filtre par préfixe : tous les groupes de l'utilisateur partent
dans le claim. C'est pour cela que l'arborescence sépare clairement ``/organismes``,
``/applications`` et ``/geonature``.

Vérifier avant d'aller plus loin
---------------------------------

.. code-block:: bash

   ISSUER=https://kc.example.org/realms/si-rnf
   curl -s -H "Authorization: Bearer $TOKEN" \
     "$ISSUER/protocol/openid-connect/userinfo" | jq .

.. code-block:: json

   {
     "sub": "f47ac10b-58cc-4372-a567-…",
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

Les quatre points à cocher : ``groups`` présent dans userinfo (pas seulement dans le JWT),
valeurs en chemin complet commençant par ``/``, tous les groupes attendus listés,
``preferred_username`` / ``email`` / ``given_name`` / ``family_name`` renseignés.

Étape 5 · le client web ``geonature-local``
--------------------------------------------

*Capability config* : **Client authentication** ON (confidential), **Standard flow** ON,
**Direct access grants** OFF, **Implicit flow** OFF, **Service accounts roles** OFF.

.. list-table::
   :header-rows: 1
   :widths: 35 65

   * - Champ
     - Valeur
   * - Valid redirect URIs
     - ``http://localhost:8000/api/auth/authorize/keycloak``
   * - Web origins
     - ``http://localhost:4200``
   * - Post logout redirect
     - ``http://localhost:4200/*``
   * - Root / Home URL
     - ``http://localhost:4200``

.. IMPORTANT::

   La redirect URI se déduit mécaniquement de la configuration GeoNature :
   ``{API_ENDPOINT}/auth/authorize/{id_provider}``. Pas de joker approximatif — une URI trop
   large est une faille, une URI fausse donne ``Invalid parameter: redirect_uri``.

Onglet *Advanced* : signature RS256, *PKCE Code Challenge Method* ``S256``, *Always use PKCE*
OFF pour un client confidential (GeoNature envoie quand même le challenge, le paramètre
``CODE_CHALLENGE_METHOD`` du TOML doit valoir ``S256``).

Onglet *Credentials* : *Client Id and Secret* ; le secret se recopie dans ``CLIENT_SECRET``
côté GeoNature. Onglet *Roles* : créer un rôle client nommé ``access``.

Étape 6 · le client service ``geonature-sync``
-----------------------------------------------

**Client authentication** ON, **Service accounts roles** ON, **Standard flow** OFF,
**Direct access grants** OFF, redirect URIs et web origins vides.

Dans *Service account roles*, filtrer sur ``realm-management`` et assigner ``query-groups``.
C'est le droit minimum, et il suffit.

.. code-block:: bash

   # 1 · jeton technique
   POST {ISSUER}/protocol/openid-connect/token
     grant_type=client_credentials

   # 2 · lecture du groupe
   GET {HOST}/admin/realms/{REALM}/group-by-path/organismes/rn-test

.. WARNING::

   Sans ``query-groups``, la lecture échoue silencieusement côté utilisateur : la connexion
   réussit, l'organisme n'est pas résolu, et seul un warning apparaît dans les logs du backend.

Étape 7 · les utilisateurs
---------------------------

``Username`` → ``t_roles.identifiant``, ``Email`` → ``t_roles.email``, ``First name`` →
``t_roles.prenom_role``, ``Last name`` → ``t_roles.nom_role``, ``Enabled`` comme condition de
connexion. Un prénom ou un nom vide fait échouer la création du rôle GeoNature : le provider
lit ``user_info["given_name"]`` sans valeur de repli.

Onglet *Groups* → *Join Group* : rattacher l'utilisateur à au moins
``/applications/geonature-local`` et à son groupe ``/organismes/…``.

Récapitulatif : les huit paramétrages sans lesquels rien ne marche
------------------------------------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 5 35 60

   * - #
     - Où
     - Quoi
   * - 1
     - Client scopes → ``roles`` → Mappers
     - *Group Membership*, claim ``groups``, full path ON, userinfo ON
   * - 2
     - Client → Client scopes
     - ``openid``, ``profile``, ``email``, ``roles`` en Default
   * - 3
     - Client ``geonature-local``
     - Standard flow ON, redirect URI exacte, secret récupéré
   * - 4
     - Client ``geonature-sync``
     - Service account ON, rôle ``query-groups``
   * - 5
     - Groups
     - Arborescence ``/organismes``, ``/applications``, ``/geonature``
   * - 6
     - Group → Attributes
     - ``id_organisme``, ``uuid_organisme``, ``nom_organisme``
   * - 7
     - Group → Role mapping
     - ``/applications/<client>`` → rôle client ``access``
   * - 8
     - Users
     - Username, email, prénom, nom, appartenance aux groupes

Le contrôle d'accès applicatif
==============================

Le realm authentifie tout le monde, mais GeoNature ne concerne que certains. Sans garde-fou,
n'importe quel compte du realm se connecte : le provider crée un ``t_roles``, l'associe à un
organisme et au groupe de réconciliation par défaut, et l'on se retrouve avec des comptes créés
par accident, à nettoyer à la main.

Avec le rôle ``access``, Keycloak refuse la connexion **avant** de délivrer le code : GeoNature
n'est jamais appelé, aucune ligne n'est créée en base.

Câbler le droit d'entrée
-------------------------

#. **Créer le rôle** : *Clients* → ``geonature-local`` → *Roles* → *Create role* → ``access``
#. **Créer le groupe** : *Groups* → *Create group* → ``/applications/geonature-local``
#. **Lier les deux** : *Groups* → le groupe → *Role mapping* → *Assign role*, filtrer par client
   → ``geonature-local:access``

Rien de tout cela n'est appliqué tant que le script ci-dessous n'est pas branché dans le browser
flow : le rôle existe, il est attribué, mais aucune étape de connexion ne le vérifie.

Le script authenticator, livré comme un JAR
--------------------------------------------

.. code-block:: text

   kc-script-auth/
      META-INF/
         keycloak-scripts.json
      client-access-guard.js

.. code-block:: json

   {
     "authenticators": [
       {
         "name": "Client Access Guard",
         "fileName": "client-access-guard.js",
         "description": "Require client role"
       }
     ]
   }

.. code-block:: bash

   jar cf client-access-guard.jar META-INF client-access-guard.js
   sudo cp client-access-guard.jar /opt/keycloak/providers/
   sudo /opt/keycloak/bin/kc.sh build
   sudo systemctl restart keycloak

Le champ ``name`` est celui qui apparaîtra dans *Authentication* → *Flows* → *Add execution*.
S'il n'y apparaît pas, c'est que la feature ``scripts`` est absente ou que le build n'a pas été
rejoué.

.. code-block:: javascript

   var AuthenticationFlowError = Java.type("org.keycloak.authentication.AuthenticationFlowError");
   var REQUIRED_ROLE = "access";
   var EXCLUDED_CLIENTS = { "account-console": true, "security-admin-console": true, "admin-cli": true };

   function authenticate(context) {
     var user = context.getUser();
     if (user == null) { context.attempted(); return; }   // étape précédente non jouée

     var client = context.getAuthenticationSession().getClient();
     if (client == null || EXCLUDED_CLIENTS[String(client.getClientId())]) { context.success(); return; }

     var role = client.getRole(REQUIRED_ROLE);
     if (role != null && user.hasRole(role)) { context.success(); return; }

     context.getEvent().error("client_role_missing");     // journalisé côté Keycloak
     var challenge = context.form().setError("invalidUserMessage").createLoginUsernamePassword();
     context.failureChallenge(AuthenticationFlowError.INVALID_USER, challenge);
   }

* ``user.hasRole()`` interroge le moteur de Keycloak, pas le JWT : les rôles hérités des groupes
  comptent.
* Le fichier doit n'exposer que des fonctions ; un ``return`` au niveau global donne une
  ``ScriptCompilationException``.
* Message volontairement générique : ne jamais révéler que le compte existe mais n'a pas le rôle.

Brancher le script dans le browser flow
----------------------------------------

Dans *Authentication* → *Flows*, dupliquer le flow ``browser`` en ``browser-rnf``, puis ajouter
les exécutions dans le sous-flow *forms* :

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

Enfin, onglet *Bindings* → *Browser Flow* = ``browser-rnf``.

Le message affiché à l'utilisateur refusé se règle dans le thème de login, fichier
``messages/messages_fr.properties`` :

.. code-block:: properties

   invalidUserMessage=Nom d'utilisateur ou mot de passe invalide ou accès non autorisé
   loginTitle=Se connecter au {0}

Un seul message pour trois situations — mauvais mot de passe, compte inconnu, accès refusé.
C'est volontaire : on ne donne aucune information exploitable.

Configurer GeoNature
====================

Le bloc ``[AUTHENTICATION]``
-----------------------------

Dans ``config/geonature_config.toml`` :

.. code-block:: toml

   [AUTHENTICATION]
   DEFAULT_RECONCILIATION_GROUP_ID = 1

   # toujours conserver un accès local
   [[AUTHENTICATION.PROVIDERS]]
   module = "pypnusershub.auth.providers.default.LocalProvider"
   id_provider = "local_provider"

   [[AUTHENTICATION.PROVIDERS]]
   module = "geonature.keycloak_provider.KeycloakOrganismProvider"
   id_provider = "keycloak"

   ISSUER = "https://kc.example.org/realms/si-rnf"
   CLIENT_ID = "geonature-local"
   CLIENT_SECRET = "…"

   # hérité de OpenIDConnectProvider
   group_claim_name = "groups"
   IDENTIFIER_FIELD = "preferred_username"
   RECONCILIATE_ATTR = "email"
   CODE_CHALLENGE_METHOD = "S256"

   # propres au provider custom
   ORGANISM_GROUP_PREFIX = "/organismes/"
   ORGANISM_UUID_CLAIM = "uuid_organisme"
   ORGANISM_NAME_CLAIM = "organisme"
   USER_UUID_CLAIM = "sub"

   KEYCLOAK_ADMIN_CLIENT_ID = "geonature-sync"
   KEYCLOAK_ADMIN_CLIENT_SECRET = "…"
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
     - URL du realm ; sert à découvrir les endpoints OIDC et à dériver l'URL de l'API admin
   * - ``IDENTIFIER_FIELD``
     - Claim utilisé comme identifiant GeoNature
   * - ``RECONCILIATE_ATTR``
     - Champ de rapprochement avec un compte existant, côté classe parente
   * - ``group_claim_name``
     - Nom du claim contenant les chemins de groupes
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

   Garder ``local_provider`` déclaré : sans lui, le frontend redirige automatiquement vers
   Keycloak, et la moindre erreur de configuration produit une boucle de redirection dont on ne
   sort plus par l'interface.

Comment le provider est chargé au démarrage
--------------------------------------------

.. code-block:: python

   # backend/geonature/app.py
   auth_manager.init_app(
       app,
       providers_declaration=config["AUTHENTICATION"]["PROVIDERS"],
   )

   # pypnusershub/auth/auth_manager.py
   module = importlib.import_module(import_path)
   class_ = getattr(module, class_name)
   instance_provider = class_()
   instance_provider.configure(configuration=provider_config)
   self.add_provider(instance_provider.id_provider, instance_provider)

La clé ``module`` du TOML est un chemin d'import Python : le provider peut vivre dans GeoNature,
dans un module tiers ou dans ``pypnusershub``. Aucune inscription au registre, aucun point
d'entrée setuptools — il suffit que la classe soit importable. ``id_provider`` devient le segment
d'URL des routes ``/auth/login/<id>`` et ``/auth/authorize/<id>``, et plusieurs providers OIDC
peuvent coexister avec chacun son bloc de configuration.

Écrire un provider custom revient donc à sous-classer, surcharger ``configure()`` et
``authorize()``, et changer une ligne de TOML.

``KeycloakOrganismProvider``
-----------------------------

La chaîne d'héritage est ``Authentication`` → ``OpenIDProvider`` → ``OpenIDConnectProvider`` →
``KeycloakOrganismProvider``.

Ce qu'il ajoute :

* résout l'organisme depuis le groupe ``/organismes/…`` et ses attributs ;
* crée ou met à jour ``bib_organismes``, puis renseigne ``t_roles.id_organisme`` ;
* recopie le claim ``sub`` dans ``t_roles.uuid_role``, après validation du format UUID ;
* force la réconciliation sur ``identifiant`` plutôt que sur l'email.

Ce qu'il ne fait pas : aucun contrôle d'accès applicatif (c'est le rôle de Keycloak), aucune
synchronisation miroir des groupes à chaque reconnexion.

``configure()`` — valider la configuration au démarrage
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: python

   class KeycloakOrganismProvider(OpenIDConnectProvider):
       def configure(self, configuration):
           super().configure(configuration)   # ISSUER, CLIENT_ID/SECRET, scopes, PKCE, Authlib

           class KeycloakOrganismConfiguration(ProviderConfigurationSchema):
               ORGANISM_GROUP_PREFIX = fields.String(load_default="/organismes/")
               ORGANISM_UUID_CLAIM = fields.String(load_default="uuid_organisme")
               USER_UUID_CLAIM = fields.String(load_default="sub")
               KEYCLOAK_ADMIN_CLIENT_ID = fields.String(load_default=None, allow_none=True)
               KEYCLOAK_ADMIN_CLIENT_SECRET = fields.String(load_default=None, allow_none=True)
               KEYCLOAK_ADMIN_TIMEOUT = fields.Integer(load_default=5)

           conf = KeycloakOrganismConfiguration().load(configuration, unknown=EXCLUDE)
           self.group_prefix = conf["ORGANISM_GROUP_PREFIX"]   # … et les autres clés
           self.keycloak_issuer = configuration.get("ISSUER")  # réutilisé pour l'API admin

Un schéma marshmallow : une clé mal orthographiée dans le TOML lève une ``ValidationError`` au
démarrage, pas à la première connexion. Tous les paramètres ont une valeur par défaut, donc un
TOML minimal suffit si l'on respecte les conventions de nommage.

``authorize()`` — le callback, de bout en bout
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: python

   def authorize(self):
       oauth_provider = getattr(oauth, self.id_provider)
       token = oauth_provider.authorize_access_token()          # 1 · code → tokens → userinfo
       session["openid_token_resp"] = token                     # conservé pour la déconnexion OIDC
       user_info = token["userinfo"]

       source_groups = user_info.get(self.group_claim_name, [])  # 2 · les groupes
       organism = self._resolve_organism(user_info, source_groups)  # 3 · l'organisme

       new_user = {
           "identifiant": user_info[self.identifier_field],
           "email": user_info["email"],
           "prenom_role": user_info["given_name"],
           "nom_role": user_info["family_name"],
           "active": True,
       }
       if keycloak_user_uuid:
           new_user["uuid_role"] = keycloak_user_uuid            # 4 · sub validé
       if organism:
           new_user["id_organisme"] = organism.id_organisme

       user = self.insert_or_update_role(                        # 5 · upsert + group_mapping
           new_user, source_groups=source_groups, reconciliate_attr="identifiant")
       db.session.commit()
       return user

``_resolve_organism()`` — la cascade de résolution
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: python

   org_uuid = user_info.get(self.organism_uuid_claim)   # si un claim direct existe
   org_name = user_info.get(self.organism_name_claim)

   if not org_uuid or not org_name:                     # sinon, on interroge l'API admin
       path = self._extract_first_group_organism_path(source_groups)   # /organismes/…
       attrs = (self._get_group_attributes_from_keycloak(path) or {}).get("attributes", {})
       org_id = int(attrs["id_organisme"][0])           # attribut = liste de chaînes
       org_uuid = org_uuid or attrs["uuid_organisme"][0]

   organism = lookup(id_organisme) or lookup(uuid_organisme) or lookup(nom_organisme)
   if not organism:
       organism = models.Organisme(nom_organisme=org_name)
       db.session.add(organism)

L'ordre de résolution est donc : ``id_organisme`` (reprise d'un identifiant existant), puis
``uuid_organisme`` (pivot entre instances), puis ``nom_organisme`` (dernier recours), et enfin
création d'un nouvel organisme.

Le canal service account, avec cache de jeton
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: python

   def _get_kc_admin_token(self):
       if self._kc_admin_token and time.time() < self._kc_admin_token_exp:
           return self._kc_admin_token      # jeton encore valide, aucun appel réseau

       resp = requests.post(
           f"{self.keycloak_issuer}/protocol/openid-connect/token",
           data={
               "grant_type": "client_credentials",
               "client_id": self.keycloak_admin_client_id,
               "client_secret": self.keycloak_admin_client_secret,
           },
           timeout=self.keycloak_admin_timeout)
       payload = resp.json()
       self._kc_admin_token = payload.get("access_token")
       self._kc_admin_token_exp = time.time() + max(payload.get("expires_in", 60) - 10, 10)
       return self._kc_admin_token

Appel nominal : ``GET /admin/realms/{realm}/group-by-path/organismes/rn-test``. L'URL de base est
dérivée de l'``ISSUER`` en remplaçant ``/realms/`` par ``/admin/realms/``. En cas d'échec de
l'endpoint, repli sur ``GET /groups?search=<feuille>&briefRepresentation=false``, puis parcours
récursif des sous-groupes jusqu'à retrouver le chemin exact.

Des groupes Keycloak vers les groupes GeoNature
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

La clé de ``group_mapping`` est le chemin exact tel qu'il apparaît dans ``userinfo.groups`` ; la
valeur est l'``id_role`` d'un groupe GeoNature, c'est-à-dire une ligne de ``t_roles`` avec
``groupe = true``.

.. list-table::
   :header-rows: 1
   :widths: 45 55

   * - Situation
     - Résultat
   * - Nouvel utilisateur, mapping trouvé
     - Groupes affectés à la création
   * - Nouvel utilisateur, aucun mapping
     - ``DEFAULT_RECONCILIATION_GROUP_ID``
   * - Utilisateur déjà existant
     - Groupes non resynchronisés

.. WARNING::

   Retirer un utilisateur d'un groupe Keycloak ne lui retire pas son groupe GeoNature. La
   synchronisation « miroir » à chaque connexion reste à implémenter dans
   ``insert_or_update_role``. Pour tester un mapping, supprimer l'utilisateur GeoNature puis se
   reconnecter : la logique ne s'applique qu'à la création.

.. code-block:: sql

   SELECT r.identifiant, g.id_role AS groupe
   FROM utilisateurs.t_roles r
   LEFT JOIN utilisateurs.cor_roles cr ON cr.id_role_utilisateur = r.id_role
   LEFT JOIN utilisateurs.t_roles g ON g.id_role = cr.id_role_groupe
   WHERE r.identifiant = 'mon_user_test';

Thème de connexion et mise en production
========================================

Une page de login aux couleurs de l'instance
---------------------------------------------

.. code-block:: text

   /opt/keycloak/themes/rnf/
       login/
           theme.properties
           resources/
               css/styles.css
               img/logo.png
           messages/
               messages_fr.properties
           footer.ftl

.. code-block:: ini

   # theme.properties
   parent=keycloak.v2
   styles=css/styles.css

Activation : *Realm settings* → *Themes* → *Login theme* = ``rnf``. Le thème hérite de
``keycloak.v2``, on ne redéfinit que ce que l'on veut changer.

.. WARNING::

   La clé ``styles`` **remplace** la liste du parent, elle ne s'y ajoute pas. Y référencer
   ``css/login.css`` sans fournir le fichier provoque un 404.

.. code-block:: css

   /* fond institutionnel */
   body.kcBodyClass, .pf-v5-c-login {
     background: #00885b !important;
   }

   /* logo à la place du titre */
   #kc-header-wrapper.pf-v5-c-brand {
     display: block;
     width: 340px; height: 120px;
     margin: 0 auto;
     background: url("../img/logo.png") no-repeat center center;
     background-size: contain;
   }

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - Symptôme
     - Cause et remède
   * - CSS modifié, rien ne change
     - Cache gzip : purger ``kc-gzip-cache``, redémarrer, Ctrl+F5
   * - Logo invisible
     - Mauvais sélecteur : viser ``#kc-header-wrapper``
   * - ``content: url(…)`` sans effet
     - Utiliser ``background: url(…)``
   * - 404 sur ``css/login.css``
     - Fichier déclaré mais absent du thème
   * - Logo aligné à droite
     - Forcer une grille CSS sur ``.pf-v5-c-login__container``

Les classes ``pf-v5-*`` viennent de PatternFly 5, le socle graphique de ``keycloak.v2`` : elles
changent d'une version majeure de Keycloak à l'autre, à revalider lors des montées de version.
En développement, après chaque modification CSS :

.. code-block:: bash

   sudo rm -rf /opt/keycloak/data/tmp/kc-gzip-cache

Déployer sur un nouvel environnement, dans l'ordre
---------------------------------------------------

Côté Keycloak :

#. Créer le realm.
#. Activer ``features=scripts``, puis ``kc.sh build``.
#. Créer les clients web, service et mobile.
#. Créer le rôle ``access`` et les groupes ``/applications/…``.
#. Configurer le mapper ``groups``.
#. Créer les groupes ``/organismes/…`` et leurs attributs.
#. Déployer le JAR et basculer le browser flow.
#. Déployer le thème de login.

Côté GeoNature :

#. Sauvegarder la base de données.
#. Renseigner le bloc ``[AUTHENTICATION]`` du TOML.
#. Déclarer le ``group_mapping`` et les groupes cibles.
#. Redémarrer le backend.
#. Vérifier ``GET /api/auth/providers``.
#. Tester un utilisateur autorisé, puis un utilisateur non autorisé.
#. Contrôler ``uuid_role`` et ``id_organisme`` en base.

Les requêtes de contrôle après la première connexion
-----------------------------------------------------

.. code-block:: sql

   -- l'utilisateur
   SELECT id_role, identifiant, uuid_role, id_organisme, active
   FROM utilisateurs.t_roles
   WHERE identifiant = 'login_test';

   -- l'organisme résolu
   SELECT id_organisme, uuid_organisme, nom_organisme
   FROM utilisateurs.bib_organismes
   WHERE id_organisme = 45;

   -- droits sur l'application
   SELECT * FROM utilisateurs.v_userslist_forall_applications
   WHERE identifiant = 'login_test';

Si des ``id_organisme`` explicites sont injectés depuis Keycloak, resynchroniser la séquence,
sinon la prochaine insertion locale entrera en collision :

.. code-block:: sql

   SELECT setval(
     pg_get_serial_sequence('utilisateurs.bib_organismes', 'id_organisme'),
     (SELECT COALESCE(MAX(id_organisme), 1) FROM utilisateurs.bib_organismes),
     true);

Dépannage : les dix symptômes déjà rencontrés
----------------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 35 30 35

   * - Symptôme
     - Cause
     - Correction
   * - ``groups`` absent de userinfo
     - *Add to userinfo* désactivé
     - Corriger le mapper
   * - ``groups`` sans le ``/`` initial
     - *Full group path* désactivé
     - Activer *Full group path*
   * - ``Invalid parameter: redirect_uri``
     - URI non identique
     - Aligner client et ``API_ENDPOINT``
   * - ``MismatchingStateError``, boucle
     - Cookies perdus, deux hostnames
     - Un seul hostname, vider les cookies
   * - ``group path does not exist``
     - Service account sans droits
     - Ajouter ``query-groups``
   * - Organisme non créé
     - Aucun groupe ``/organismes/``
     - Rattacher l'utilisateur au groupe
   * - ``uuid_role`` vide
     - Claim ``sub`` absent ou invalide
     - Vérifier ``USER_UUID_CLAIM``
   * - Groupes GeoNature non affectés
     - Utilisateur déjà existant
     - Recréer le compte, ou affecter à la main
   * - *Client Access Guard* introuvable
     - Feature ``scripts``, ou pas de build
     - ``kc.sh build`` puis redémarrage
   * - ``Invalid return statement``
     - ``return`` global dans le script
     - Tout mettre dans des fonctions

Les règles à ne pas négocier
-----------------------------

* **Secrets** — rotation de tous les ``CLIENT_SECRET`` utilisés pendant la mise au point, avant
  l'ouverture aux utilisateurs.
* **TLS de bout en bout** — Keycloak, l'API et le frontend. Un code d'autorisation qui transite
  en clair est un compte compromis.
* **Journaux** — ne jamais écrire dans les logs un token, un ``code``, un ``code_verifier`` ou un
  secret.
* **Moindre privilège** — ``geonature-sync`` ne détient que ``query-groups``, en lecture seule.
* **Redirect URIs** — liste blanche stricte, web comme mobile. Pas de joker sur un domaine entier.
* **Messages d'erreur** — un seul libellé générique à la connexion, qui ne révèle ni l'existence
  du compte ni l'absence de droit.
* **Mobile** — client public et PKCE obligatoire, jamais de secret embarqué dans l'application.
* **Accès de secours** — conserver ``local_provider`` et un compte administrateur local si
  Keycloak tombe.

Ce qui reste devant nous
-------------------------

* **Flux mobile PKCE** — endpoint ``POST /api/auth/mobile/keycloak``, client public, redirection
  sur schéma natif, même logique de réconciliation, réponse JSON avec le JWT GeoNature.
* **Synchronisation miroir** — appliquer ``group_mapping`` à chaque connexion, retraits compris,
  dans ``insert_or_update_role``, ce qui ferait de Keycloak la source unique des groupes.
  Décision d'architecture à prendre.
* **Fédération et MFA** — brancher un annuaire en amont, activer la double authentification pour
  les profils sensibles, sans toucher une ligne de GeoNature.

Un partenariat est engagé avec l'ONF pour développer des versions officielles d'Occtax mobile et
de Monitoring mobile capables de s'authentifier auprès d'un fournisseur d'identité externe :
Keycloak de notre côté, Azure / Entra ID du leur, même protocole. Côté GeoNature, rien de
spécifique — un provider déclaré dans le TOML, comme pour le web.

Bonus : fédérer un annuaire LDAP
================================

Keycloak devient la façade de l'annuaire : les comptes et les mots de passe restent dans
OpenLDAP ou Active Directory, Keycloak en garde une copie locale et gère les groupes et rôles,
GeoNature ne change pas (mêmes claims, même provider, même TOML). Le mot de passe reste vérifié
par l'annuaire : Keycloak ne le copie pas et ne le stocke pas.

*User federation* → *Add LDAP provider* :

.. list-table::
   :header-rows: 1
   :widths: 30 35 35

   * - Champ
     - OpenLDAP
     - Active Directory
   * - Vendor
     - Other
     - Active Directory
   * - Connection URL
     - ``ldaps://ldap.example.org:636``
     - ``ldaps://dc.example.local:636``
   * - Bind DN
     - ``cn=keycloak,ou=services,dc=…``
     - ``CN=keycloak,OU=Services,DC=…``
   * - Users DN
     - ``ou=people,dc=example,dc=org``
     - ``OU=Users,DC=example,DC=local``
   * - Username LDAP attribute
     - ``uid``
     - ``sAMAccountName``
   * - RDN LDAP attribute
     - ``uid``
     - ``cn``
   * - UUID LDAP attribute
     - ``entryUUID``
     - ``objectGUID``
   * - User object classes
     - ``inetOrgPerson``, ``organizationalPerson``
     - ``person``, ``organizationalPerson``, ``user``
   * - Edit mode
     - READ_ONLY
     - READ_ONLY
   * - Import users
     - ON
     - ON

Avant d'enregistrer, utiliser *Test connection* et *Test authentication*. Puis lancer
*Synchronize all users*, et prévoir une synchronisation périodique si l'annuaire bouge. Un
*User LDAP filter* permet de ne remonter qu'une sous-population.

Keycloak crée seul les mappers d'attributs (username, email, first name, last name) : ce sont
exactement les champs dont GeoNature a besoin. Pour remonter aussi les groupes de l'annuaire,
ajouter un ``group-ldap-mapper`` (``LDAP Groups DN`` ``ou=groups,dc=example,dc=org``,
``Group Name LDAP Attribute`` ``cn``, ``Group Object Classes`` ``groupOfNames``,
``Membership LDAP Attribute`` ``member``, mode ``READ_ONLY``).

.. WARNING::

   * Les groupes importés arrivent à la racine de l'arborescence, pas sous ``/organismes/``.
     Garder les groupes métier côté Keycloak plutôt que d'essayer de les faire porter par
     l'annuaire.
   * En ``READ_ONLY``, prénom, nom et mot de passe ne se modifient plus que dans l'annuaire.
     C'est voulu, mais il faut le dire aux utilisateurs.
   * Le ``Username LDAP attribute`` devient ``preferred_username``, donc ``t_roles.identifiant``.
     En changer après coup casse la réconciliation des comptes existants.
   * Supprimer puis recréer le provider de fédération recrée les utilisateurs côté Keycloak :
     nouveau ``sub``, donc nouveau ``uuid_role``. À éviter en production.

Les trois choses à retenir
==========================

#. Keycloak authentifie, GeoNature autorise.
#. Le mapper ``groups`` doit alimenter ``userinfo``.
#. Les attributs d'organisme passent par l'API admin, pas par le token.

Support de présentation
=======================

:pdfembed:`src:_static/keycloak/support_keycloak.pdf, height:420, width:100%, align:middle`
