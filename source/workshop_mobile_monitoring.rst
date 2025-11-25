====================================================
Workshop GN Mobile Monitoring - Développement Mobile
====================================================

Formation développement mobile Flutter pour GeoNature
======================================================

.. contents:: Table des matières
   :local:
   :depth: 2

Introduction
============

Ce workshop vise à former une dizaine de participants au développement mobile avec Flutter, dans le contexte de l'application **GN Mobile Monitoring** (application mobile pour le module monitoring de GeoNature).

**Public** : Géomaticiens, développeurs Python, profils techniques variés

**Prérequis** :
- Connaissances de base en programmation
- Git
- Environnement Linux/macOS (ou WSL sur Windows)

**Format** :
- Présentation : Atelier SI en réseau du 26 novembre 2025
- Semaine de développement : 5 jours en groupe

Informations pratiques
======================

Date
----

Du 1er au 5 décembre 2025

Participants
------------

~10 personnes

Support technique
-----------------

- **Organisateur** : Antoine Schlegel
- **Canal communication** : https://matrix.to/#/!kFgKRPJSfydPQpWPOW:matrix.org?via=matrix.org
- **Points quotidiens** : Matins et soirs

Objectifs pédagogiques
=======================

À l'issue de ce workshop, les participants sauront :

1. **Développement mobile** : Comprendre les spécificités du mobile (offline-first, performances, UI tactile)
2. **Langage Dart** : Syntaxe, null-safety, async/await, collections
3. **Framework Flutter** : Widgets, layout, navigation, state management
4. **Clean Architecture** : Séparation des couches Domain/Data/Presentation
5. **Logique métier** : Identifier et isoler la logique métier
6. **Outils** : Git, Flutter DevTools, ADB, tests unitaires et d'intégration



Partie 1 : Introduction écosystème
=================================

**Contexte rapide** : GeoNature est une plateforme de gestion de données naturalistes. Le module monitoring permet la saisie de données sur différentes protocoles.
L'application mobile gn_mobile_monitoring permet la saisie terrain en mode offline.

**Démonstration** : 
Parcours utilisateur complet (login → téléchargement protocole → sélection protocole → saisie visite et observation → téléversement → synchronisation)

.. raw:: html

   <div style="text-align: center;">
      <video width="300" autoplay loop muted controls>
         <source src="_static/workshop/ma-demo-compressed.mp4" type="video/mp4">
         Votre navigateur ne supporte pas la balise vidéo.
      </video>
   </div>



Partie 2 : Installation et setup
================================

Installation de l'environnement de développement
------------------------------------------------

Installation de Flutter
~~~~~~~~~~~~~~~~~~~~~~~

**Sur Ubuntu/Linux** :

.. code-block:: bash

   # 1. Télécharger Flutter SDK
   cd ~/
   wget https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.22.3-stable.tar.xz
   tar xf flutter_linux_3.22.3-stable.tar.xz

   # 2. Ajouter Flutter au PATH (dans ~/.bashrc ou ~/.zshrc)
   echo 'export PATH="$HOME/flutter/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc

   # 3. Vérifier l'installation
   flutter doctor

**Sur Windows** :

1. Télécharger Flutter SDK depuis https://flutter.dev/docs/get-started/install/windows
2. Extraire dans ``C:\src\flutter`` (éviter les espaces dans le chemin)
3. Ajouter ``C:\src\flutter\bin`` au PATH système
4. Ouvrir un nouveau terminal et vérifier :

.. code-block:: powershell

   flutter doctor

Installation d'Android Studio
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Sur Ubuntu** :

.. code-block:: bash

   # 1. Télécharger depuis https://developer.android.com/studio
   # ou via snap
   sudo snap install android-studio --classic

   # 2. Lancer Android Studio
   android-studio

   # 3. Suivre l'assistant de configuration
   # Installer : Android SDK, Android SDK Platform-Tools, Android Emulator

**Sur Windows** :

1. Télécharger depuis https://developer.android.com/studio
2. Lancer l'installateur et suivre les instructions
3. Durant l'installation, cocher :
   - Android SDK
   - Android SDK Platform-Tools
   - Android Virtual Device

**Configuration Flutter** :

.. code-block:: bash

   # Accepter les licences Android
   flutter doctor --android-licenses

   # Vérifier que tout est OK
   flutter doctor -v

Options de développement
------------------------

Option 1 : Téléphone physique (recommandé)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Activer le mode développeur sur Android** :

1. Aller dans **Paramètres** → **À propos du téléphone**
2. Taper 7 fois sur **Numéro de build**
3. Retourner dans **Paramètres** → **Options pour développeurs**
4. Activer :
   - **Options pour développeurs**
   - **Débogage USB**
5. Connecter le téléphone par USB
6. Autoriser le débogage USB sur le popup

**Développer avec VS Code/Cursor** :

1. Ouvrir le projet dans VS Code/Cursor
2. Installer l'extension **Flutter** (Dart Code)
3. En bas à droite, cliquer sur le device selector
4. Sélectionner votre téléphone dans la liste
5. Appuyer sur **F5** ou **Run → Start Debugging**

Option 2 : Émulateur Android
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Créer un émulateur dans Android Studio** :

1. Ouvrir **Android Studio** → **Tools** → **AVD Manager**
2. Cliquer sur **Create Virtual Device**
3. Choisir un téléphone (ex: Pixel 6a)
4. Choisir une image système (API 33 recommandé)
5. Finaliser la configuration

**Développer avec VS Code/Cursor** :

1. Ouvrir le projet dans VS Code/Cursor
2. Ouvrir la palette de commandes : **Ctrl+Shift+P** (ou **Cmd+Shift+P** sur Mac)
3. Taper : **Flutter: Launch Emulator**
4. Sélectionner l'émulateur créé
5. Attendre le démarrage complet
6. Appuyer sur **F5** pour lancer l'app en debug

.. tip::
   VS Code/Cursor affiche automatiquement les devices disponibles dans la barre de statut en bas. 
   Vous pouvez cliquer dessus pour changer rapidement de device.

Installation du projet GN Mobile Monitoring
-------------------------------------------

**Cloner et configurer le projet** :

.. code-block:: bash

   # 1. Clone
   git clone https://github.com/RNF-SI/gn_mobile_monitoring.git
   cd gn_mobile_monitoring

   # 2. Dépendances
   flutter pub get

   # 3. Génération de code
   make generate_code

   # 4. Configuration serveur de test
   cp .env.test.example .env.test
   nano .env.test

**Configuration .env.test** :

.. code-block:: bash

   TEST_SERVER_URL=https://geonature-test.reservenaturelle.fr
   TEST_USERNAME=participant_01
   TEST_PASSWORD=motdepasse_secret
   TEST_MODULES=POPAAMPHIBIEN,POPREPTILE

**Premier lancement** :

.. code-block:: bash

   make run

**Vérification** :

.. code-block:: bash

   make test-unit

Partie 3 : Visite guidée du code (30 min)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Architecture Clean Architecture
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. image:: _static/workshop/clean_architecture_overview.png
   :alt: Vue d'ensemble Clean Architecture
   :align: center
   :width: 90%

*Diagramme montrant les 3 couches concentriques : Domain (centre), Data (milieu), Presentation (extérieur)*

**Les 3 couches** :

1. **💼 DOMAIN (Business Logic)**

   - ``lib/domain/model/`` : Modèles métier (Freezed)
   - ``lib/domain/usecase/`` : Cas d'usage métier
   - ``lib/domain/repository/`` : Interfaces
   - **Indépendant** de toute technologie

2. **🔧 DATA (Technical Details)**

   - ``lib/data/datasource/api/`` : API REST (Dio)
   - ``lib/data/datasource/database/`` : Base de données (Drift/SQLite)
   - ``lib/data/repository/`` : Implémentations
   - ``lib/data/mapper/`` : Conversions Entity ↔ Model

3. **🎨 PRESENTATION (UI)**

   - ``lib/presentation/view/`` : Écrans et pages
   - ``lib/presentation/viewmodel/`` : State management (Riverpod)
   - ``lib/presentation/widgets/`` : Widgets réutilisables

**Principe fondamental** : Direction des dépendances **Extérieur → Intérieur**

.. note::
   Le Domain ne dépend de RIEN. C'est le cœur de l'application, complètement indépendant des frameworks et technologies.

Inversion de Dépendances (DIP)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. image:: _static/workshop/dependency_inversion.png
   :alt: Diagramme d'inversion de dépendances
   :align: center
   :width: 70%

*Diagramme montrant le flux : UseCase → IRepository ← RepositoryImpl*

**Problème** : Dépendance directe ❌

.. code-block:: text

   UseCase → RepositoryImpl (dépendance concrète)

**Solution** : Inversion ✅

.. code-block:: text

   UseCase → IRepository (interface abstraite)
                  ↑
                  |
           RepositoryImpl (implémente l'interface)

**Avantages** :

- ✅ Testabilité (mocks faciles)
- ✅ Flexibilité (changer DB/API sans toucher au métier)
- ✅ Maintenabilité (responsabilités claires)

Exemple de code
^^^^^^^^^^^^^^^

.. image:: _static/workshop/flow_diagram_example.png
   :alt: Flux complet d'une fonctionnalité
   :align: center
   :width: 100%

*Diagramme de séquence : Widget → ViewModel → UseCase → Repository → DataSource*

**Interface (Domain)** :

.. code-block:: dart

   // lib/domain/repository/sites_repository.dart
   abstract class SitesRepository {
     Future<List<Site>> getSites();
   }

**Implémentation (Data)** :

.. code-block:: dart

   // lib/data/repository/sites_repository_impl.dart
   class SitesRepositoryImpl implements SitesRepository {
     final SitesApi _api;
     final SitesDao _dao;

     @override
     Future<List<Site>> getSites() async {
       try {
         // API d'abord
         final sites = await _api.fetchSites();
         await _dao.saveSites(sites);
         return sites;
       } catch (e) {
         // Fallback DB locale
         return _dao.getSites();
       }
     }
   }

**Use Case (Domain)** :

.. code-block:: dart

   // lib/domain/usecase/get_sites_usecase.dart
   @riverpod
   class GetSitesUseCase extends _$GetSitesUseCase {
     Future<List<Site>> call() async {
       return ref.read(sitesRepositoryProvider).getSites();
     }
   }

Partie 4 : Fonctionnalités à développer (20 min)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

6 fonctionnalités proposées
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. image:: _static/workshop/features_mockups.png
   :alt: Mockups des 6 fonctionnalités
   :align: center
   :width: 100%

*Aperçu visuel des 6 fonctionnalités à implémenter*

1. **🗺️ Carte interactive** (🟡 Moyen) - 2-3 personnes

   - Afficher les sites sur une carte OpenStreetMap
   - Marqueurs cliquables
   - Support offline
   - Bibliothèque : ``flutter_map``

   .. image:: _static/workshop/feature_map.png
      :alt: Exemple carte interactive
      :width: 45%

2. **📊 Export CSV** (🟢 Facile) - 1-2 personnes

   - Exporter observations en CSV
   - Partage du fichier
   - Colonnes : id, date, espèce, observateur, lat, lon, commentaire

   .. image:: _static/workshop/feature_csv.png
      :alt: Exemple export CSV
      :width: 45%

3. **🔍 Filtres avancés** (🟡 Moyen) - 2-3 personnes

   - Filtrer par date, module, statut sync, observateur
   - Filtres combinables
   - Persistance des filtres

   .. image:: _static/workshop/feature_filters.png
      :alt: Exemple filtres avancés
      :width: 45%

4. **📈 Graphiques statistiques** (🟡 Moyen) - 2-3 personnes

   - Bar chart : observations par module
   - Line chart : évolution temporelle
   - Pie chart : top 5 espèces
   - Bibliothèque : ``fl_chart``

   .. image:: _static/workshop/feature_charts.png
      :alt: Exemples de graphiques
      :width: 60%

5. **🎨 Dark Mode** (🟢-🟡 Facile/Moyen) - 1-2 personnes

   - Thème dark
   - Switch light/dark/system
   - Persistance du choix

   .. image:: _static/workshop/feature_darkmode.png
      :alt: Comparaison light/dark mode
      :width: 70%

6. **🔧 Mode offline amélioré** (🔴 Complexe) - 2-3 personnes

   - Indicateur online/offline
   - Badge sur éléments non synchronisés
   - Sync en arrière-plan
   - Gestion des conflits

   .. image:: _static/workshop/feature_offline.png
      :alt: Indicateurs offline et sync
      :width: 60%

Partie 5 : Ressources et support (10 min)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Documentation disponible** :

- ``README.md`` : Vue d'ensemble
- ``CLAUDE.md`` : Instructions développement
- ``docs/ARCHITECTURE_VISUELLE.md`` : Diagrammes architecture
- ``docs/CODE_EXAMPLES.md`` : Patterns de code
- ``docs/FEATURES_OVERVIEW.md`` : Fonctionnalités supportées

**Workflow Git** :

.. code-block:: bash

   # Créer une branche
   git checkout -b feature/nom-feature

   # Commits réguliers
   git add .
   git commit -m "feat: description"

   # Push
   git push origin feature/nom-feature

   # Créer Pull Request sur GitHub

**Commandes essentielles** :

.. code-block:: bash

   make run              # Lancer l'app
   make test-unit        # Tests unitaires
   make test-integration # Tests d'intégration
   make format           # Formater le code
   make analyze          # Analyser le code
   make generate_code    # Générer le code (Freezed, Drift)

Semaine de développement (5 jours)
-----------------------------------

.. image:: _static/workshop/workshop_timeline.png
   :alt: Timeline du workshop sur 5 jours
   :align: center
   :width: 100%

*Timeline visuelle : Lundi (setup) → Mardi-Jeudi (développement) → Vendredi (démos)*

Points quotidiens
~~~~~~~~~~~~~~~~~

**Matin (9h - 15 min)** :

- Tour de table : objectifs de la journée
- Blocages éventuels
- Support technique

**Soir (17h - 15 min)** :

- Tour de table : avancement
- Démos rapides (optionnel)
- Préparation du lendemain

Workflow de développement
~~~~~~~~~~~~~~~~~~~~~~~~~~

.. image:: _static/workshop/dev_workflow.png
   :alt: Workflow de développement
   :align: center
   :width: 100%

*Diagramme du workflow : Issue → Branch → Dev → Test → PR → Review → Merge*

1. **Choisir une issue** sur GitHub (labels 🟢 🟡 🔴)
2. **Créer une branche** ``feature/nom-feature``
3. **Développer** en suivant Clean Architecture
4. **Tester** : ``make test-unit``
5. **Formater** : ``make format``
6. **Analyser** : ``make analyze``
7. **Commit** : messages clairs (feat, fix, refactor, test, docs)
8. **Push** et créer une Pull Request
9. **Revue de code** par l'organisateur
10. **Merge** si validé

Support asynchrone
~~~~~~~~~~~~~~~~~~

- Canal Slack #workshop-mobile
- Réponses aux questions techniques
- Revue de code intermédiaire si demandé

Démos et clôture (Vendredi)
----------------------------

Démos (15h-17h)
~~~~~~~~~~~~~~~

Chaque groupe présente sa fonctionnalité (10-15 min) :

- Démonstration live
- Retour sur les difficultés
- Apprentissages clés
- Code notable (patterns intéressants)

Rétrospective
~~~~~~~~~~~~~

- Ce qui a bien fonctionné
- Ce qui peut être amélioré
- Feedback sur la formation
- Questionnaire de satisfaction

Concepts clés
=============

Développement mobile
--------------------

Spécificités du mobile
~~~~~~~~~~~~~~~~~~~~~~

.. image:: _static/workshop/offline_first_diagram.png
   :alt: Stratégie offline-first
   :align: center
   :width: 80%

*Diagramme montrant le flux : DB locale (cache) ↔ API (quand en ligne) avec queue de synchronisation*

- **Offline-first** : L'app doit fonctionner sans connexion
- **Performances** : Device moins puissant qu'un PC
- **UI tactile** : Cibles de 48x48 dp minimum
- **Batterie** : Optimiser les opérations réseau et CPU
- **Stockage** : Limité, attention à la taille de la DB

Flutter vs natif vs React Native
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Flutter** :

- ✅ Performances quasi-natives (compilé en code machine)
- ✅ Un seul codebase pour Android + iOS
- ✅ Hot reload rapide
- ✅ Widgets riches (Material Design + Cupertino)
- ⚠️ Taille de l'app plus importante

Langage Dart
-------------

Syntaxe de base
~~~~~~~~~~~~~~~

.. code-block:: dart

   // Variables
   int age = 25;
   double prix = 19.99;
   String nom = 'Alice';
   bool actif = true;

   // Null-safety
   String? nullable; // Peut être null
   String nonNull = 'value'; // Ne peut pas être null

   // Collections
   List<String> fruits = ['pomme', 'banane'];
   Map<String, int> ages = {'Alice': 25, 'Bob': 30};

   // Fonctions
   int additionner(int a, int b) => a + b;

   // Async/await
   Future<String> fetchData() async {
     await Future.delayed(Duration(seconds: 2));
     return 'Data loaded';
   }

Classes et modèles
~~~~~~~~~~~~~~~~~~

.. code-block:: dart

   // Classe simple
   class Person {
     final String name;
     final int age;

     Person(this.name, this.age);
   }

   // Avec Freezed (immutable)
   @freezed
   class User with _$User {
     const factory User({
       required int id,
       required String name,
       String? email,
     }) = _User;

     factory User.fromJson(Map<String, dynamic> json) =>
         _$UserFromJson(json);
   }

Framework Flutter
-----------------

Widgets de base
~~~~~~~~~~~~~~~

.. code-block:: dart

   // Layout vertical
   Column(
     children: [
       Text('Titre'),
       Text('Sous-titre'),
     ],
   )

   // Layout horizontal
   Row(
     children: [
       Icon(Icons.star),
       Text('5.0'),
     ],
   )

   // Container (box model)
   Container(
     width: 100,
     height: 100,
     padding: EdgeInsets.all(16),
     decoration: BoxDecoration(
       color: Colors.blue,
       borderRadius: BorderRadius.circular(8),
     ),
     child: Text('Hello'),
   )

   // Liste
   ListView.builder(
     itemCount: items.length,
     itemBuilder: (context, index) {
       return ListTile(
         title: Text(items[index].name),
       );
     },
   )

State management (Riverpod)
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. image:: _static/workshop/riverpod_provider_types.png
   :alt: Types de providers Riverpod
   :align: center
   :width: 90%

*Diagramme comparatif des types de providers : Provider (sync), FutureProvider (async), StateNotifier (mutable state)*

.. code-block:: dart

   // Provider simple
   @riverpod
   String greeting(GreetingRef ref) {
     return 'Hello';
   }

   // FutureProvider (async)
   @riverpod
   Future<String> fetchData(FetchDataRef ref) async {
     await Future.delayed(Duration(seconds: 2));
     return 'Data loaded';
   }

   // StateNotifier (état mutable)
   @riverpod
   class Counter extends _$Counter {
     @override
     int build() => 0;

     void increment() => state++;
     void decrement() => state--;
   }

   // Utilisation dans un Widget
   class MyWidget extends ConsumerWidget {
     @override
     Widget build(BuildContext context, WidgetRef ref) {
       final count = ref.watch(counterProvider);

       return Text('Count: $count');
     }
   }

Clean Architecture
------------------

Pourquoi Clean Architecture ?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Problèmes sans architecture** :

- ❌ Logique métier mélangée avec l'UI
- ❌ Difficile à tester
- ❌ Dépendance forte aux frameworks
- ❌ Difficulté à changer de technologie (DB, API)

**Avantages de Clean Architecture** :

- ✅ **Testabilité** : Logique métier isolée et facilement testable
- ✅ **Flexibilité** : Changer DB ou API sans toucher au métier
- ✅ **Maintenabilité** : Responsabilités claires
- ✅ **Réutilisabilité** : Domain peut être réutilisé dans d'autres apps

Les 3 couches en détail
~~~~~~~~~~~~~~~~~~~~~~~~

.. image:: _static/workshop/architecture_layers_detailed.png
   :alt: Détail des 3 couches avec arborescence de fichiers
   :align: center
   :width: 100%

*Diagramme montrant la structure des dossiers pour chaque couche avec exemples de fichiers*

**1. DOMAIN Layer (💼 Business Logic)** :

- Contient toute la logique métier
- Indépendant de toute technologie
- Modèles avec ``@freezed`` (immutabilité)
- Repositories = interfaces abstraites
- Use cases = une action métier = une classe

**2. DATA Layer (🔧 Technical Implementation)** :

- Implémente les détails techniques
- Data Sources : API REST, SQLite
- Entities : Représentent les tables DB
- Mappers : Convertissent Entity ↔ Domain Model
- Repository Impl : Implémente l'interface du Domain

**3. PRESENTATION Layer (🎨 User Interface)** :

- Affichage et interactions utilisateur
- Views : Widgets Flutter (pages, écrans)
- ViewModels : Gestion d'état avec Riverpod
- Widgets : Composants UI réutilisables
- Ne connaît que le **Domain** (pas la Data)

Logique métier
--------------

.. image:: _static/workshop/business_logic_flow.png
   :alt: Flux de la logique métier
   :align: center
   :width: 90%

*Diagramme montrant le cheminement d'une requête à travers les couches*

Qu'est-ce qu'une logique métier ?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Définition** : Les règles et processus qui définissent le comportement de l'application, indépendamment de la technologie.

**Exemples dans GeoNature** :

- ✅ Validation des données d'observation (date cohérente, espèce valide)
- ✅ Calcul de la compatibilité des modules
- ✅ Gestion des permissions CRUVED (qui peut Créer, Lire, Mettre à jour, Valider, Exporter, Supprimer)
- ✅ Synchronisation et résolution de conflits
- ✅ Filtrage des observations selon critères métier

**Contre-exemples (logique technique, pas métier)** :

- ❌ Appel HTTP avec Dio
- ❌ Requête SQL avec Drift
- ❌ Affichage d'un widget Flutter
- ❌ Navigation entre écrans

Où placer la logique métier ?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. image:: _static/workshop/architecture_dependencies_graph.png
   :alt: Graphe de dépendances entre composants
   :align: center
   :width: 100%

*Graphe montrant toutes les dépendances : Widget → ViewModel → UseCase → Repository → DataSource (API/Database)*

**Use Cases (Domain)** : La logique métier doit être dans les Use Cases

.. code-block:: dart

   // ✅ BON : Use Case avec logique métier
   @riverpod
   class ValidateObservationUseCase extends _$ValidateObservationUseCase {
     Future<ValidationResult> call(Observation obs) async {
       // Logique métier : validation
       if (obs.date.isAfter(DateTime.now())) {
         return ValidationResult.error('Date future non autorisée');
       }

       if (obs.latitude == null || obs.longitude == null) {
         return ValidationResult.error('Coordonnées GPS requises');
       }

       return ValidationResult.success();
     }
   }

.. code-block:: dart

   // ❌ MAUVAIS : Logique métier dans un Widget
   class ObservationForm extends StatelessWidget {
     void submit() {
       // ❌ Ne pas faire ça !
       if (obs.date.isAfter(DateTime.now())) {
         showError('Date future non autorisée');
       }
     }
   }

Tests
-----

.. image:: _static/workshop/testing_pyramid.png
   :alt: Pyramide des tests
   :align: center
   :width: 70%

*Pyramide des tests : Tests unitaires (base large) → Tests d'intégration (milieu) → Tests E2E (sommet)*

Tests unitaires
~~~~~~~~~~~~~~~

**Objectif** : Tester la logique métier de façon isolée, sans dépendances externes.

**Exemple** :

.. code-block:: dart

   void main() {
     late MockSitesRepository mockRepository;
     late GetSitesUseCase useCase;

     setUp(() {
       mockRepository = MockSitesRepository();
       // Setup avec Riverpod ProviderContainer
     });

     group('GetSitesUseCase', () {
       test('should return list of sites', () async {
         // Arrange
         final expectedSites = [
           Site(id: 1, name: 'Site 1', code: 'S1'),
           Site(id: 2, name: 'Site 2', code: 'S2'),
         ];
         when(mockRepository.getSites())
             .thenAnswer((_) async => expectedSites);

         // Act
         final result = await useCase.call();

         // Assert
         expect(result, expectedSites);
         verify(mockRepository.getSites()).called(1);
       });
     });
   }

Tests d'intégration
~~~~~~~~~~~~~~~~~~~

**Objectif** : Tester les flux complets avec un serveur réel.

**Exemple** :

.. code-block:: dart

   @Tags(['integration'])
   void main() {
     late TestServerConfig config;

     setUpAll(() async {
       config = await TestEnvironmentSetup.getConfig();
     });

     test('should login and fetch sites', () async {
       // Login
       await AuthHelper.loginWithTestConfig(config);

       // Récupérer sites
       final sites = await sitesRepository.getSites('POPAAMPHIBIEN');

       // Assert
       expect(sites, isNotEmpty);
     });
   }

Exécution
~~~~~~~~~

.. code-block:: bash

   # Tests unitaires uniquement
   flutter test --exclude-tags=integration

   # Tests d'intégration uniquement
   flutter test test/integration/ --tags=integration

   # Tous les tests
   flutter test

Ressources techniques
=====================

Bibliothèques utilisées
------------------------

Packages principaux
~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 40 40

   * - Package
     - Description
     - Documentation
   * - ``riverpod``
     - State management
     - https://riverpod.dev/
   * - ``freezed``
     - Modèles immutables
     - https://pub.dev/packages/freezed
   * - ``drift``
     - SQLite ORM
     - https://drift.simonbinder.eu/
   * - ``dio``
     - HTTP client
     - https://pub.dev/packages/dio
   * - ``go_router``
     - Navigation
     - https://pub.dev/packages/go_router
   * - ``flutter_hooks``
     - Hooks React-like
     - https://pub.dev/packages/flutter_hooks

Packages pour le workshop
~~~~~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 40 40

   * - Package
     - Usage
     - Documentation
   * - ``flutter_map``
     - Carte interactive (OpenStreetMap)
     - https://docs.fleaflet.dev/
   * - ``fl_chart``
     - Graphiques (bar, line, pie)
     - https://pub.dev/packages/fl_chart
   * - ``csv``
     - Export CSV
     - https://pub.dev/packages/csv
   * - ``share_plus``
     - Partage de fichiers
     - https://pub.dev/packages/share_plus

Commandes essentielles
-----------------------

Flutter
~~~~~~~

.. code-block:: bash

   # Lancer l'app
   flutter run

   # Choisir un device
   flutter devices
   flutter run -d <device-id>

   # Hot reload (dans le terminal)
   r          # Hot reload
   R          # Hot restart
   q          # Quitter

   # Tests
   flutter test
   flutter test --coverage

   # Build
   flutter build apk           # Android APK
   flutter build appbundle     # Android App Bundle
   flutter build ios           # iOS

   # Nettoyage
   flutter clean
   flutter pub get

Make (shortcuts du projet)
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   make run                # Lancer l'app
   make test-unit          # Tests unitaires
   make test-integration   # Tests d'intégration
   make test-all           # Tous les tests
   make format             # Formater le code
   make analyze            # Analyser le code
   make generate_code      # Générer code (Freezed, Drift)
   make apk                # Build APK Android
   make aab                # Build App Bundle Android

ADB (Android Debug Bridge)
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   # Devices
   adb devices

   # Logs
   adb logcat
   adb logcat | grep flutter

   # Screenshots
   adb exec-out screencap -p > screenshot.png

   # Base de données
   adb shell run-as com.example.gn_mobile_monitoring
   cd databases
   ls
   # Copier en local
   adb pull /data/data/com.example.gn_mobile_monitoring/databases/app.db

Git
~~~

.. code-block:: bash

   # Créer une branche
   git checkout -b feature/nom-feature

   # Status
   git status

   # Commit
   git add .
   git commit -m "feat: description"

   # Push
   git push origin feature/nom-feature

   # Mettre à jour depuis develop
   git checkout develop
   git pull
   git checkout feature/nom-feature
   git merge develop

Troubleshooting
===============

Problèmes courants
------------------

Erreur de génération de code
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptôme** : ``flutter pub run build_runner build`` échoue

**Solution** :

.. code-block:: bash

   rm -rf .dart_tool/build
   flutter clean
   flutter pub get
   make generate_code

Tests qui échouent
~~~~~~~~~~~~~~~~~~

**Symptôme** : ``flutter test`` échoue

**Solutions** :

1. Vérifier que le code compile : ``make analyze``
2. Vérifier les imports
3. Lancer les tests un par un pour isoler le problème
4. Vérifier les mocks (annotations ``@GenerateMocks``)

Problèmes de navigation
~~~~~~~~~~~~~~~~~~~~~~~~

**Symptôme** : ``context.go('/ma-page')`` ne fonctionne pas

**Solutions** :

1. Vérifier que la route est définie dans ``app_router.dart``
2. Vérifier que le path commence par ``/``
3. Utiliser ``context.push()`` au lieu de ``context.go()`` si besoin de revenir

Problèmes Riverpod
~~~~~~~~~~~~~~~~~~

**Symptôme** : Provider non trouvé

**Solutions** :

1. Vérifier que ``make generate_code`` a été exécuté
2. Vérifier les imports (``part`` et ``part of``)
3. Vérifier que le provider est annoté avec ``@riverpod``

Problèmes de base de données
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptôme** : Erreur Drift "table doesn't exist"

**Solution** :

.. code-block:: bash

   # Supprimer la DB de l'émulateur
   adb shell run-as com.example.gn_mobile_monitoring
   cd databases
   rm app.db
   # Relancer l'app

Liens utiles
============

Documentation officielle
------------------------

- Flutter : https://docs.flutter.dev/
- Dart Language Tour : https://dart.dev/guides/language/language-tour
- Riverpod : https://riverpod.dev/
- Drift : https://drift.simonbinder.eu/

Projet GeoNature
----------------

- GeoNature Docs : https://docs.geonature.fr/
- gn_module_monitoring : https://github.com/PnX-SI/gn_module_monitoring
- gn_mobile_monitoring : https://github.com/PnX-SI/gn_mobile_monitoring

Outils
------

- VS Code : https://code.visualstudio.com/
- Android Studio : https://developer.android.com/studio
- DB Browser for SQLite : https://sqlitebrowser.org/
- Postman (test API) : https://www.postman.com/

Annexes
=======

Checklist préparation
---------------------

Avant le workshop
~~~~~~~~~~~~~~~~~

.. code-block:: text

   ☐ Documentation relue et corrigée
   ☐ Serveur GeoNature de test accessible
   ☐ Modules POPAAMPHIBIEN et POPREPTILE installés
   ☐ 10 comptes utilisateurs créés
   ☐ Issues GitHub créées avec labels
   ☐ Canal Slack/Discord créé
   ☐ Email pré-workshop envoyé
   ☐ Tests unitaires passent à 100%

Pendant la réunion
~~~~~~~~~~~~~~~~~~~

.. code-block:: text

   ☐ Présentation GeoNature + démo
   ☐ Installation pour tous les participants
   ☐ Clone + pub get + generate_code OK
   ☐ Configuration .env.test
   ☐ Premier lancement validé
   ☐ Tests unitaires passent
   ☐ Présentation architecture
   ☐ Attribution features
   ☐ Accès documentation

Critères de succès
------------------

.. code-block:: text

   ☐ Tous les participants ont l'environnement fonctionnel
   ☐ Au moins 4 features sur 6 complétées (même partiellement)
   ☐ Pull Requests créées avec code testé
   ☐ Démos réussies le vendredi
   ☐ Feedback positif des participants
   ☐ Au moins 80% des participants se sentent capables de continuer à contribuer

Contact
=======

**Organisateur** : Antoine Schlegel

**Support** : Slack #workshop-mobile

**Email** : antoine.schlegel@example.com

**Repository** : https://github.com/PnX-SI/gn_mobile_monitoring

----

*Document créé le 6 novembre 2025*

*Version 1.0*
