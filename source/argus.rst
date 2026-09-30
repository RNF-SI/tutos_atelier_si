==============================================================
Suivre les versions de ses applications avec Argus (GeoNature)
==============================================================

.. contents:: Table des matières
   :local:
   :depth: 2

Ce tutoriel décrit la mise en place d'`Argus <https://release-argus.io>`_, un outil qui
surveille les versions des applications d'un parc et signale celles qui ont pris du retard.
Il couvre l'installation, l'exposition derrière un proxy HTTPS, la configuration générale,
puis le cas détaillé de **GeoNature et de ses modules**, qui demande un peu de travail
parce que GeoNature n'expose pas la version de ses modules sans authentification.

.. container:: info-box

   **L'idée directrice**

   Argus compare, pour chaque application, deux nombres : la **dernière version publiée**
   par l'éditeur et la **version réellement déployée** chez vous. Tout le travail de
   configuration consiste à lui indiquer où trouver ces deux nombres.

.. NOTE::

   Ce tutoriel n'est pas issu d'un atelier : il documente une mise en place réalisée sur
   l'infrastructure de RNF. Le public visé est un administrateur système à l'aise avec
   Linux, Apache et Docker.


Principe de fonctionnement
==========================

Pour chaque application suivie, Argus compare deux valeurs :

``latest_version``
   La dernière version publiée. Argus sait lire les *releases* d'un dépôt GitHub (le cas
   le plus courant) ou extraire un numéro d'une page web par expression régulière.

``deployed_version``
   La version installée chez vous. Argus la récupère par une **requête HTTP** — en pointant
   une clé dans une réponse JSON, ou par expression régulière — ou bien vous la saisissez
   à la main.

.. WARNING::

   Argus ne sait interroger **qu'en HTTP(S)**. Il ne se connecte pas en SSH, ne lit pas de
   fichier local, n'interroge pas une base de données. Pour une application qui n'expose pas
   sa version sans authentification, la méthode retenue ici consiste à publier un **petit
   fichier JSON** sur le serveur de l'application, généré par un script et servi par le
   serveur web déjà en place, avec un accès restreint à la seule IP d'Argus.

Argus répond à la question « suis-je à jour ? ». Il ne dit rien des dépendances internes
d'une application développée en interne : pour cela, voir OWASP Dependency-Track et les
SBOM CycloneDX, qui sortent du périmètre de ce tutoriel.


Prérequis et conventions
========================

Ce qu'il vous faut
------------------

.. container:: prereq-box

   * Un serveur (ou conteneur) dédié pour Argus, avec Docker.
   * Un accès administrateur aux serveurs des applications à suivre.
   * Un reverse proxy HTTPS si vous voulez exposer l'interface d'Argus publiquement.
   * Un jeton GitHub de lecture (facultatif mais fortement recommandé, voir plus bas).

Valeurs à remplacer
-------------------

.. WARNING::

   **Tous les noms de domaine et toutes les adresses IP de ce tutoriel sont des exemples.**
   Remplacez-les par les vôtres. De même, aucun jeton d'authentification ne doit être
   recopié tel quel ni committé dans un dépôt : les blocs ci-dessous utilisent des
   variables d'environnement et des placeholders ``<…>``.

.. list-table::
   :header-rows: 1
   :widths: 35 65

   * - Dans ce tutoriel
     - À remplacer par
   * - ``10.0.0.10``
     - l'IP interne de votre serveur Argus
   * - ``10.0.0.21``, ``10.0.0.22``…
     - les IP internes de vos serveurs applicatifs
   * - ``argus.example.org``
     - le nom de domaine public de votre Argus
   * - ``geonature-saisie.example.org``
     - le nom de domaine de votre instance GeoNature
   * - ``<JETON_GITHUB>``, ``<JETON_ZAMMAD>``…
     - vos jetons, jamais en clair dans un dépôt

La contrainte réseau à comprendre d'abord
-----------------------------------------

C'est le point qui fait perdre le plus de temps si on le découvre en route. Dans une
infrastructure où le TLS est terminé sur un proxy public, les serveurs applicatifs ne
peuvent pas se joindre entre eux par leur nom de domaine public : le DNS renvoie l'IP du
proxy, pas celle du conteneur. Trois conséquences :

#. Il faut **forcer la résolution nom → IP interne** dans le conteneur Argus, via
   ``extra_hosts``.
#. Appeler l'IP seule ne suffit pas : Apache choisit son *vhost* d'après l'en-tête ``Host``.
   Une requête vers ``http://10.0.0.22/`` atterrit sur le mauvais vhost et renvoie
   typiquement un ``404``. D'où la combinaison **vrai nom de domaine + extra_hosts**.
#. Le port **443 n'est généralement pas ouvert** sur les conteneurs applicatifs, le TLS
   étant terminé au proxy. Argus les interroge donc en ``http://`` sur le port 80.


Installer Argus
===============

Préparer Docker
---------------

Sur Debian, le paquet ``docker.io`` ne fournit pas ``docker-compose-plugin``. Il faut
installer **Compose v2** manuellement — l'ancien ``docker-compose`` v1 ne sait pas lire les
fichiers de composition récents :

.. code-block:: bash

   sudo mkdir -p /usr/local/lib/docker/cli-plugins
   sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
     -o /usr/local/lib/docker/cli-plugins/docker-compose
   sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
   docker compose version

**Vérification attendue** : ``docker compose version`` affiche une version ``v2.x``.

Autorisez ensuite votre utilisateur à piloter Docker :

.. code-block:: bash

   sudo usermod -aG docker <utilisateur>
   newgrp docker

.. WARNING::

   Appartenir au groupe ``docker`` équivaut à disposer des droits root sur la machine.
   N'y ajoutez que les comptes qui administrent réellement le service.

Créer l'arborescence
--------------------

.. code-block:: text

   ~/argus/
   ├── docker-compose.yml
   ├── config.yml        # propriétaire UID 911
   └── data/             # base SQLite argus.db, propriétaire UID 911

L'image tourne sous l'UID 911 : les fichiers montés doivent lui appartenir, sinon Argus ne
pourra pas écrire sa base ni réenregistrer sa configuration.

.. code-block:: bash

   mkdir -p ~/argus/data && cd ~/argus
   touch config.yml
   sudo chown -R 911:911 ~/argus/data ~/argus/config.yml

Le fichier ``docker-compose.yml``
---------------------------------

.. code-block:: yaml

   services:
     argus:
       image: releaseargus/argus:latest
       volumes:
         - ./config.yml:/app/config.yml
         - ./data:/app/data
       ports:
         - "127.0.0.1:8092:8080"
       healthcheck:
         test: ["CMD", "/healthcheck", "http://localhost:8080/api/v1/healthcheck"]
         interval: 1m
         timeout: 10s
         retries: 3
         start_period: 10s
       restart: unless-stopped
       environment:
         GITHUB_TOKEN: "<JETON_GITHUB>"
       extra_hosts:
         - "geonature-saisie.example.org:10.0.0.22"
         - "geonature.example.org:10.0.0.21"

Deux choses à noter :

* Le port est lié à ``127.0.0.1`` : Argus n'est **pas** joignable directement depuis le
  réseau, uniquement via le proxy local décrit plus bas. Choisissez un port libre sur
  l'hôte (ici 8092) ; un port déjà pris provoque ``bind: address already in use``.
* ``extra_hosts`` contient une ligne par application à interroger — c'est la réponse à la
  contrainte réseau vue plus haut.

.. WARNING::

   Toute modification de ce fichier (variables d'environnement, ``extra_hosts``) exige
   ``docker compose up -d``. Un simple ``docker compose restart`` **ne recharge pas**
   l'environnement du conteneur, et vous chercherez longtemps pourquoi votre jeton reste
   vide.

Premier démarrage
-----------------

.. code-block:: bash

   docker compose up -d
   docker compose logs -f argus

.. WARNING::

   Avec l'authentification activée, la page de création du premier administrateur est
   accessible **sans identifiant** : le premier visiteur devient administrateur. Créez ce
   compte immédiatement après le démarrage, avant d'exposer le service.


Exposer Argus en HTTPS
======================

Vhost local sur le serveur Argus
--------------------------------

Dans ``/etc/apache2/sites-available/argus.conf`` :

.. code-block:: apache

   <VirtualHost *:80>
       ServerName argus.example.org

       RequestHeader set X-Forwarded-Proto "https"

       ProxyPreserveHost On
       ProxyRequests Off
       ProxyPass        /ws ws://127.0.0.1:8092/ws
       ProxyPassReverse /ws ws://127.0.0.1:8092/ws
       ProxyPass        /   http://127.0.0.1:8092/ upgrade=websocket
       ProxyPassReverse /   http://127.0.0.1:8092/

       ErrorLog  ${APACHE_LOG_DIR}/argus_error.log
       CustomLog ${APACHE_LOG_DIR}/argus_access.log combined
   </VirtualHost>

.. code-block:: bash

   sudo a2enmod proxy proxy_http proxy_wstunnel headers
   sudo a2ensite argus
   sudo apachectl configtest && sudo systemctl reload apache2

**Vérification attendue** : ``configtest`` répond ``Syntax OK``.

Proxy HTTPS public
------------------

.. container:: info-box

   **Le piège : les WebSockets**

   L'interface d'Argus se rafraîchit via un WebSocket sur ``/ws``. Si le proxy public ne le
   relaie pas explicitement, la page affiche « WebSocket connecting » en boucle et Argus
   journalise ``'upgrade' token not found in 'Connection' header``. L'interface semble
   installée mais ne montre jamais de données.

.. code-block:: apache

   <VirtualHost *:443>
       ServerName argus.example.org

       ProxyPreserveHost On
       ProxyPass        /ws ws://10.0.0.10/ws
       ProxyPassReverse /ws ws://10.0.0.10/ws
       ProxyPass        /   http://10.0.0.10/ upgrade=websocket
       ProxyPassReverse /   http://10.0.0.10/

       RequestHeader set X-Forwarded-Proto "https"

       # ModSecurity : exclure l'API et le WebSocket
       <Location /api/v1>
           SecRuleEngine Off
       </Location>
       <Location /ws>
           SecRuleEngine Off
       </Location>

       ErrorLog  ${APACHE_LOG_DIR}/argus-error.log
       CustomLog ${APACHE_LOG_DIR}/argus-access.log combined

       SSLCertificateFile    /etc/letsencrypt/live/argus.example.org/fullchain.pem
       SSLCertificateKeyFile /etc/letsencrypt/live/argus.example.org/privkey.pem
       Include /etc/letsencrypt/options-ssl-apache.conf
   </VirtualHost>

``sudo a2enmod proxy_wstunnel`` est également nécessaire sur le proxy. La directive
``upgrade=websocket`` demande Apache **2.4.47 ou plus récent**.

Les exclusions ModSecurity sur ``/api/v1`` et ``/ws`` évitent que le jeu de règles CRS
bloque l'API interne et la négociation du WebSocket.


Configurer Argus : le fichier ``config.yml``
============================================

Structure générale
------------------

.. code-block:: yaml

   settings:
     auth:
       enabled: true
       session:
         secure_cookie: true        # site servi uniquement en HTTPS
     log:
       level: INFO
     web:
       trusted_proxies:
         - 127.0.0.1
         - 172.16.0.0/12            # passerelle du réseau Docker

   defaults:
     service:
       options:
         interval: 6h
       latest_version:
         access_token: ${GITHUB_TOKEN}

   service:
     # … un bloc par application

.. container:: info-box

   **Pourquoi un jeton GitHub**

   Sans jeton, GitHub limite l'API à 60 requêtes par heure et par IP : avec une vingtaine
   de services vérifiés toutes les 6 heures, la limite tombe vite et Argus journalise
   ``rate limit reached for GitHub``. Un *fine-grained token* **sans aucune permission**
   suffit — il ne sert qu'à lever la limite sur des dépôts publics — et fait passer le
   quota à 5000 requêtes par heure. Notez sa date d'expiration.

Règles de fonctionnement
------------------------

Cinq règles évitent la quasi-totalité des mauvaises surprises :

#. Argus lit ``config.yml`` **uniquement au démarrage**. Après une édition manuelle :
   ``docker compose restart argus``.
#. **L'interface web réécrit ``config.yml``.** N'éditez jamais le fichier à la main pour
   ensuite enregistrer depuis l'interface sans redémarrage intermédiaire : vos
   modifications manuelles seraient écrasées. Les ancres YAML sont par ailleurs développées
   lors d'une réécriture.
#. Les services sont indentés de **2 espaces** sous ``service:``, sans tabulation.
#. Les variables ``${VAR}`` sont substituées dans ``url``, ``headers``, ``basic_auth`` et
   ``access_token`` — **pas dans ``body``**. Un jeton placé dans ``body`` partira littéralement
   et produira un ``401``.
#. Validez toujours la syntaxe avant de redémarrer :

   .. code-block:: bash

      python3 -c 'import yaml; yaml.safe_load(open("config.yml")); print("YAML OK")'

.. WARNING::

   Une erreur de syntaxe dans ``config.yml`` fait redémarrer le conteneur en boucle et
   l'interface affiche une page vide. Le diagnostic se lit dans
   ``docker compose logs argus``.

Dans le tableau de bord, **Skip** ignore une version jusqu'à la suivante, et **Approve**
déclenche les commandes et webhooks associés au service (aucun n'est configuré dans cette
mise en place).


Ajouter une instance GeoNature
==============================

Pourquoi ce n'est pas immédiat
------------------------------

GeoNature n'offre pas de route utilisable directement :

* ``GET /api/gn_commons/config`` est publique et renvoie ``GEONATURE_VERSION``, mais **pas
  les versions des modules**.
* ``GET /api/gn_commons/modules`` donne les modules, mais **exige une session** (jeton JWT
  à durée limitée) : inutilisable par Argus.

La solution retenue s'appuie sur une observation simple : les versions de GeoNature **et**
de tous ses modules sont celles des paquets Python installés dans le venv. Un script les
publie dans un seul fichier JSON, qui devient la source unique pour l'application et tous
ses modules.

Étape 1 — Le script de génération
---------------------------------

Sur **chaque serveur GeoNature**. Vérifiez d'abord le chemin du venv avec
``ls ~/geonature/backend/venv/bin/pip``, puis adaptez ``<user>`` (le compte d'installation
de GeoNature) :

.. code-block:: bash

   sudo tee /usr/local/bin/gn-versions.sh > /dev/null <<'EOF'
   #!/bin/sh
   /home/<user>/geonature/backend/venv/bin/pip list --format=json 2>/dev/null \
    | python3 -c 'import json,sys; print(json.dumps({p["name"].lower(): p["version"] for p in json.load(sys.stdin)}))' \
    > /var/www/argus/gn-versions.json
   EOF
   sudo mkdir -p /var/www/argus
   sudo chmod +x /usr/local/bin/gn-versions.sh
   sudo /usr/local/bin/gn-versions.sh && head -c 300 /var/www/argus/gn-versions.json

**Vérification attendue** : un JSON du type
``{"geonature": "2.17.1", "gn_module_export": "1.8.2", …}``.

Puis la mise à jour périodique :

.. code-block:: bash

   echo '*/30 * * * * root /usr/local/bin/gn-versions.sh' | sudo tee /etc/cron.d/gn-versions

.. NOTE::

   Après une montée de version de GeoNature, relancez le script à la main
   (``sudo /usr/local/bin/gn-versions.sh``) plutôt que d'attendre le cron : Argus reflétera
   immédiatement la nouvelle version.

Étape 2 — Publier le fichier avec Apache
----------------------------------------

.. WARNING::

   Ajoutez ces lignes **dans le fichier du site** (``/etc/apache2/sites-enabled/…``, bloc
   ``<VirtualHost *:80>``) et **pas** dans ``conf-available/geonature.conf`` : ce dernier est
   géré par l'installation de GeoNature et sera écrasé à la prochaine mise à jour.

.. code-block:: apache

   <VirtualHost *:80>
       ServerName geonature-saisie.example.org

       # Versions pour Argus
       Alias /argus/gn-versions.json /var/www/argus/gn-versions.json
       <Location "/argus/gn-versions.json">
           Require ip 10.0.0.10
       </Location>

       IncludeOptional /etc/apache2/conf-available/geonature.conf
       IncludeOptional /etc/apache2/conf-available/usershub.conf

       ErrorLog  "/var/log/apache2/geonature_error.log"
       CustomLog "/var/log/apache2/geonature_access.log" combined
   </VirtualHost>

Le ``Require ip`` limite la lecture du fichier à la seule IP d'Argus : la liste des
versions installées n'est pas exposée publiquement.

Si ce vhost redirige tout vers HTTPS, placez l'exception **avant** la règle de
redirection, sinon Argus recevra un ``301`` au lieu du fichier :

.. code-block:: apache

   RewriteCond %{REQUEST_URI} !^/argus/

.. code-block:: bash

   sudo apachectl configtest && sudo systemctl reload apache2

Étape 3 — Tester depuis le serveur Argus
----------------------------------------

Le nom dans ``--resolve`` et celui dans l'URL doivent être **identiques**, sans quoi le test
ne reproduit pas ce que fera Argus :

.. code-block:: bash

   curl -sS -i --resolve geonature-saisie.example.org:80:10.0.0.22 \
     http://geonature-saisie.example.org/argus/gn-versions.json | head -20

**Vérification attendue** : un code ``200`` et le JSON des versions. Un ``403``, ``404`` ou
``301`` renvoie à la section Dépannage — corrigez avant d'aller plus loin, Argus ne fera
pas mieux que ``curl``.

.. NOTE::

   Si le serveur GeoNature est dans un autre sous-réseau, l'IP d'Argus vue par Apache peut
   être celle d'une passerelle ou d'un NAT. En cas de ``403``, relevez l'adresse réellement
   refusée dans le journal d'erreurs d'Apache et ajoutez-la au ``Require ip``.

Étape 4 — Déclarer l'hôte dans Docker
-------------------------------------

Ajoutez la ligne correspondante dans ``extra_hosts`` du ``docker-compose.yml``, puis :

.. code-block:: bash

   docker compose up -d
   docker compose exec argus cat /etc/hosts

**Vérification attendue** : la correspondance nom → IP apparaît dans le ``/etc/hosts`` du
conteneur.

Étape 5 — Déclarer les services dans ``config.yml``
---------------------------------------------------

Un bloc par composant suivi. Voici le modèle pour une instance et ses modules — répétez en
adaptant le nom, le domaine, le tag et la liste des modules :

.. code-block:: yaml

     GeoNature Saisie:
       latest_version:
         type: github
         url: PnX-SI/GeoNature
         url_commands:
           - type: regex
             regex: ^v?([0-9.]+)$
       deployed_version:
         type: url
         url: http://geonature-saisie.example.org/argus/gn-versions.json
         json: geonature
       dashboard:
         tags: [geonature-saisie]

     GeoNature Saisie - Monitoring:
       latest_version:
         type: github
         url: PnX-SI/gn_module_monitoring
         url_commands:
           - type: regex
             regex: ^v?([0-9.]+)$
       deployed_version:
         type: url
         url: http://geonature-saisie.example.org/argus/gn-versions.json
         json: gn_module_monitoring
       dashboard:
         tags: [geonature-saisie]

     GeoNature Saisie - Export:
       latest_version:
         type: github
         url: PnX-SI/gn_module_export
         url_commands:
           - type: regex
             regex: ^v?([0-9.]+)$
       deployed_version:
         type: url
         url: http://geonature-saisie.example.org/argus/gn-versions.json
         json: gn_module_export
       dashboard:
         tags: [geonature-saisie]

L'expression ``^v?([0-9.]+)$`` isole le numéro de version des tags GitHub, qu'ils soient
écrits ``v2.17.1`` ou ``2.17.1``, et écarte les pré-versions.

Le ``tags`` permet de filtrer le tableau de bord par instance — pratique dès qu'on suit
plusieurs GeoNature.

Correspondances dépôts et clés JSON
-----------------------------------

.. list-table::
   :header-rows: 1
   :widths: 25 40 35

   * - Composant
     - Dépôt GitHub (``latest_version.url``)
     - Clé JSON (``deployed_version.json``)
   * - GeoNature
     - ``PnX-SI/GeoNature``
     - ``geonature``
   * - Monitoring
     - ``PnX-SI/gn_module_monitoring``
     - ``gn_module_monitoring``
   * - Export
     - ``PnX-SI/gn_module_export``
     - ``gn_module_export``
   * - Dashboard
     - ``PnX-SI/gn_module_dashboard``
     - ``gn_module_dashboard``
   * - TaxHub
     - ``PnX-SI/TaxHub``
     - ``taxhub``

.. NOTE::

   Occtax, Occhab et Validation sont livrés avec GeoNature (clés ``occtax``,
   ``gn_module_occhab``, ``gn_module_validation``) : inutile de les suivre séparément, leur
   version est celle de GeoNature.

   ``pypnusershub`` est la bibliothèque d'authentification, à ne pas confondre avec
   l'application UsersHub, qui se suit séparément.

Étape 6 — Vérifier
------------------

Validez le YAML, redémarrez, puis dans l'interface cliquez sur **Refresh** pour chaque
service :

.. code-block:: bash

   python3 -c 'import yaml; yaml.safe_load(open("config.yml")); print("YAML OK")'
   docker compose restart argus

**Vérification attendue** : chaque service affiche une version déployée et une dernière
version publiée.

.. container:: info-box

   **Argus révèle les mises à jour incomplètes**

   Sur une instance de test, après une montée en 2.17.5, le JSON ne contenait plus aucun
   module : la migration avait recréé le venv sans réinstaller les modules. L'erreur
   ``failed to find value for "…"`` a mis le problème en évidence — il serait autrement
   passé inaperçu jusqu'au premier utilisateur bloqué.

   Réinstallation depuis le venv activé (vérifiez les codes de module dans la documentation
   de chacun) :

   .. code-block:: bash

      geonature install-gn-module ~/gn_module_monitoring MONITORINGS
      geonature install-gn-module ~/gn_module_export EXPORTS
      geonature install-gn-module ~/gn_module_dashboard DASHBOARD
      sudo systemctl restart geonature geonature-worker
      sudo /usr/local/bin/gn-versions.sh

Option : suivre PostgreSQL et PostGIS
-------------------------------------

Si PostgreSQL tourne sur le même serveur, ajoutez au script de génération (en adaptant le
nom de la base) :

.. code-block:: bash

   PG=$(sudo -u postgres psql -Atc "SHOW server_version" | cut -d' ' -f1)
   PGIS=$(sudo -u postgres psql -d geonature2db -Atc "SELECT postgis_lib_version()" 2>/dev/null)
   echo "{\"postgresql\":\"$PG\",\"postgis\":\"$PGIS\"}" > /var/www/argus/pg-version.json

Exposez ``pg-version.json`` avec un ``Alias`` identique à celui de ``gn-versions.json``.

Pour PostgreSQL, ce qui compte n'est pas la dernière version majeure existante mais la
dernière **mineure de la branche majeure installée** — c'est elle qui porte les correctifs
de sécurité. L'API endoflife.date le donne directement :

.. code-block:: yaml

     PostgreSQL - GeoNature Saisie:
       latest_version:
         type: url
         url: https://endoflife.date/api/v1/products/postgresql/releases/17
         url_commands:
           - type: regex
             regex: '"latest":\{"name":"([0-9.]+)"'
       deployed_version:
         type: url
         url: http://geonature-saisie.example.org/argus/pg-version.json
         json: postgresql
       dashboard:
         tags: [geonature-saisie, postgresql]


Ajouter d'autres applications
=============================

Application exposant sa version derrière un jeton d'en-tête
-----------------------------------------------------------

Exemple avec Zammad. Le jeton est créé dans **Profil → Jeton d'accès**, sur un compte
technique dédié :

.. code-block:: yaml

     Zammad:
       latest_version:
         type: github
         url: zammad/zammad
         url_commands:
           - type: regex
             regex: ^v?([0-9.]+)$
       deployed_version:
         type: url
         url: http://10.0.0.12/api/v1/version
         headers:
           - key: Authorization
             value: 'Token token=${ZAMMAD_TOKEN}'
         json: version
         regex: ^([0-9.]+)
       dashboard:
         tags: [support]

Le ``regex`` final nettoie la valeur lue : Zammad renvoie une chaîne du type
``7.0.1-1778078595.d438e0a.debian13``, dont on ne garde que ``7.0.1``.

Application exposant sa version via un jeton dans l'URL
-------------------------------------------------------

Exemple avec Matomo. Le jeton se crée sur un compte technique en lecture seule, en
décochant « N'autoriser que les requêtes sécurisées (POST) » pour permettre l'appel en GET :

.. code-block:: yaml

     Matomo:
       latest_version:
         type: github
         url: matomo-org/matomo
         url_commands:
           - type: regex
             regex: ^v?([0-9.]+)$
       deployed_version:
         type: url
         url: http://matomo.example.org/index.php?module=API&method=API.getMatomoVersion&format=json&token_auth=${MATOMO_TOKEN}
         json: value
       dashboard:
         tags: [matomo]

Application sans version exposée
--------------------------------

Pour Keycloak, LimeSurvey et les applications comparables, la version n'est pas accessible
sans authentification. Deux options :

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Option
     - Mise en œuvre
   * - **Suivi manuel**
     - ``deployed_version: {type: manual, version: "x.y.z"}``, à corriger dans l'interface
       (Edit → Deployed Version) après chaque montée de version.
   * - **Script maison**
     - Publier un ``version.json`` sur le modèle de GeoNature, et revenir à un suivi
       automatique.

Le suivi manuel a un défaut à connaître : il n'échoue jamais bruyamment. Si personne ne
pense à le mettre à jour, Argus affichera indéfiniment une version obsolète comme si elle
était à jour.


Dépannage
=========

.. list-table::
   :header-rows: 1
   :widths: 32 34 34

   * - Symptôme
     - Cause
     - Correction
   * - ``unknown shorthand flag: 'd'`` ou ``'compose' is not a docker command``
     - Plugin Compose v2 absent
     - Installation manuelle du plugin
   * - ``'name' does not match any of the regexes``
     - Ancien ``docker-compose`` v1
     - Utiliser ``docker compose`` (v2)
   * - ``permission denied … docker.sock``
     - Utilisateur hors du groupe ``docker``
     - ``sudo usermod -aG docker <utilisateur>``
   * - ``bind: address already in use``
     - Port hôte déjà occupé
     - Changer le port de gauche dans ``ports:``
   * - Page vide, conteneur qui redémarre en boucle
     - Erreur dans ``config.yml``
     - Valider le YAML, lire ``docker compose logs argus``
   * - Modification manuelle ignorée
     - Pas de redémarrage
     - ``docker compose restart argus``
   * - Variable d'environnement vide dans le conteneur
     - ``restart`` au lieu de ``up -d``
     - ``docker compose up -d``
   * - ``404`` en appelant l'IP d'un serveur Apache
     - Mauvais vhost sélectionné
     - Vrai nom de domaine + ``extra_hosts``
   * - ``connect: connection refused`` sur ``:443``
     - TLS non disponible en interne
     - Interroger en ``http://``
   * - ``301`` vers ``https://``
     - Vhost port 80 qui redirige, ou résolution via le proxy public
     - Exception ``RewriteCond`` ; vérifier ``extra_hosts``
   * - ``403``
     - IP d'Argus non autorisée, ou requête passée par le proxy public
     - Vérifier ``docker compose exec argus cat /etc/hosts`` et ``Require ip``
   * - ``failed to find value for "…"``
     - Clé absente du JSON (module non installé)
     - Vérifier le module ; après migration, le réinstaller
   * - ``rate limit reached for GitHub``
     - 60 requêtes/h sans jeton
     - ``access_token`` dans ``defaults``
   * - ``401`` avec un jeton placé dans ``body``
     - ``${VAR}`` non substitué dans ``body``
     - Mettre le jeton dans l'URL ou en en-tête
   * - « WebSocket connecting » en boucle
     - Le proxy public ne relaie pas ``/ws``
     - Règles ``ws://`` + ``upgrade=websocket``


Maintenance
===========

Ajouter un module à une instance existante
------------------------------------------

#. Relancer ``gn-versions.sh`` sur le serveur concerné et vérifier que la clé du module
   apparaît dans le JSON.
#. Ajouter le bloc de service dans ``config.yml``.
#. Valider le YAML, ``docker compose restart argus``, puis **Refresh** dans l'interface.

Mettre à jour Argus
-------------------

.. code-block:: bash

   cd ~/argus
   docker compose pull
   docker compose up -d
   docker compose logs -f argus

Sauvegardez ``config.yml`` et ``data/argus.db`` avant une montée de version majeure.

Renouveler les jetons
---------------------

Les jetons expirent. Notez leurs dates d'expiration quelque part de fiable : un jeton
GitHub expiré se manifeste par le retour du ``rate limit reached``, ce qui n'est pas
évident à relier à sa cause.


Sécurité
========

.. container:: prereq-box

   **À respecter**

   * **Aucun jeton dans un dépôt.** Variables d'environnement dans ``docker-compose.yml``,
     et ce fichier exclu de tout versionnement.
   * **Comptes techniques dédiés**, avec les droits minimaux — lecture seule partout où
     c'est possible.
   * **Jeton GitHub sans permission** : la lecture des dépôts publics n'en demande aucune.
   * **Fichiers de version restreints** à la seule IP d'Argus via ``Require ip``.
   * **Argus lui-même** : authentification activée, port lié à ``127.0.0.1``, accès public
     uniquement via le proxy HTTPS.

.. WARNING::

   Un jeton qui a circulé en clair — dans un ticket, un canal de discussion, un
   copier-coller — doit être considéré comme compromis : révoquez-le et créez-en un
   nouveau, même si l'incident semble sans conséquence.


Pour aller plus loin
====================

* `Documentation d'Argus <https://release-argus.io/docs/>`_
* `Dépôt GitHub d'Argus <https://github.com/release-argus/Argus>`_
* `endoflife.date <https://endoflife.date>`_ — fins de support et dernières versions
  mineures, utile pour tout ce qui n'est pas sur GitHub
