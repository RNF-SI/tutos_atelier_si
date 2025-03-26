.. _cursor_integration:

=====================================
Intégration de Cursor dans le Projet
=====================================

..  youtube:: TgS50tdTMTY

Ce tutoriel explique comment utiliser l'éditeur **Cursor** pour bénéficier d'une assistance IA 
adaptée à votre architecture Flutter/Dart, tout en vous présentant quelques raccourcis clavier utiles.
Cursor est un fork de vscode.

.. contents:: Sommaire
   :depth: 2
   :local:

Introduction
============

L'éditeur **Cursor** permet d’écrire du code plus rapidement grâce à l’auto-complétion, 
l’inline chat, et un système de **.cursorrules** permettant de personnaliser les conventions de code.

Raccourcis Clavier (Shortcuts)
==============================

Cursor offre plusieurs raccourcis pratiques pour interagir avec l’IA :

- **Ctrl + K** : *Inline Chat*  
  Cela vous permet de sélectionner un bloc de code et de demander directement des modifications ou des explications.  
  Exemple : sélectionnez une fonction, appuyez sur **Ctrl + K**, puis posez une question ou demandez une refactorisation.

- **Ctrl + L** : *Chat*  
  Ouvre le panneau de discussion latéral, où vous pouvez converser avec l’IA de manière plus générale, 
  poser des questions hors contexte du code sélectionné, etc.

- **Ctrl + I** : *Composer*  
  Ouvre le composer, qui vous aide à générer de nouveaux fichiers ou de nouveaux blocs de code d’après un prompt.  
  C’est très utile lorsque vous souhaitez créer rapidement une classe, un widget, ou tout autre code standard.

Configurer .cursorrules
=======================

Le fichier **`.cursorrules`** placé à la racine du projet indique à l'IA vos règles de style, 
d’architecture et de bonnes pratiques. 

Par exemple :

.. code-block:: none

   You are an expert in Flutter, Dart, Riverpod, Drift, Freezed, and Clean Architecture.

   ////////////////////////////////////////////////////////////////////////
   // Flexibility Notice
   // (Vos notes et recommandations ici)
   ////////////////////////////////////////////////////////////////////////

   // Flutter Best Practices
   // ...

   // Project Structure
   // ...

   // etc.

Pour plus d’exemples, vous pouvez consulter le dépôt suivant :  
`awesome-cursorrules <https://github.com/PatrickJS/awesome-cursorrules/tree/main>`_

Ce fichier permet à Cursor de mieux comprendre votre organisation (par ex. “3 couches : data, domain, presentation”), 
vos conventions de nommage (snake_case pour les fichiers, CamelCase pour les classes, etc.), 
et vos préférences (utilisation de Riverpod, de Freezed, etc.).

Dossier .cursor-prompts
=======================

Vous pouvez créer un dossier **`.cursor-prompts/`** à la racine de votre projet pour stocker différents 
fichiers de prompts, par exemple :

.. code-block:: bash

   .cursor-prompts/
   ├── create_model.prompt
   ├── create_widget.prompt
   ├── create_viewmodel.prompt
   └── create_api.prompt

Chaque fichier `.prompt` contient un template et des instructions pour générer automatiquement du code.  
Par exemple, `create_model.prompt` pourrait expliquer comment créer un nouveau modèle Freezed :

.. code-block:: md

   # create_model.prompt

   Vous êtes un expert Flutter, Dart, etc.
   Créez un nouveau modèle dans le dossier `domain/model/`...

Lorsque vous appuyez sur **Ctrl + K** (chat) ou **Ctrl + I** (Composer) dans Cursor, vous pouvez invoquer l’un de ces prompts 
et gagner du temps dans la création de vos fichiers.

Conseils d’Utilisation
======================

1. **Ouvrir le projet dans Cursor**  
   Lancez Cursor et ouvrez votre dossier contenant `.cursorrules` et `.cursor-prompts/`.

2. **Vérifier la prise en compte de .cursorrules**  
   Cursor devrait automatiquement repérer ce fichier et ajuster ses suggestions 
   (style, conventions, architecture) en conséquence.

3. **Utiliser les Raccourcis** :

- **Ctrl + K** (Inline Chat) pour interagir directement sur un bloc de code sélectionné.
  
- **Ctrl + L** (Chat) pour une conversation plus globale, sans sélection de code.

- **Ctrl + I** (Composer) pour invoquer un prompt ou créer rapidement un fichier.

1. **Créer ou Modifier des Prompts**  
   Si vous voyez que vous avez souvent besoin d’un même patron de code (UseCase, Repository, etc.), 
   créez un nouveau fichier `.prompt` dans `.cursor-prompts/` et décrivez précisément le rendu souhaité.  
   Vous pourrez alors l’utiliser directement dans Cursor.

Conclusion
==========

Cursor, associé à un fichier `.cursorrules` et à des prompts personnalisés, 
peut grandement accélérer votre développement Flutter/Dart, tout en respectant votre architecture Clean Architecture, 
vos normes de code et votre style de projet.

N’hésitez pas à personnaliser davantage vos règles et vos prompts pour répondre parfaitement à vos besoins. 
Pour aller plus loin :

- Consultez la documentation officielle de Cursor.
- Explorez les `.cursorrules` existants sur `awesome-cursorrules <https://github.com/PatrickJS/awesome-cursorrules/tree/main>`_.
- Créez ou adaptez vos propres prompts pour générer tout type de code récurrent (pages, widgets, viewmodels, etc.).
