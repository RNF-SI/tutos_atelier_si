.. _vs_code_optimisation:

===========================================
Optimisations et Astuces pour VS Code
===========================================

Ce tutoriel explique comment optimiser votre environnement de développement 
**VS Code**. Tout au long de ce guide, les exemples seront donnés pour un projet en **Dart** et **Flutter**, suivant les principes de **Clean Architecture**.

.. contents:: Sommaire
   :depth: 2
   :local:

Introduction
============

Dans ce guide, nous allons voir :

- Comment configurer des **tâches** (tasks) pour automatiser la création de fichiers 
  (ex. interface + implémentation).
- Comment configurer des **snippets** (modèles de code) dans VS Code.
- Les bonnes pratiques pour structurer votre code en adéquation avec les règles Clean Architecture.

Tâches VSCode (Tasks)
======================

Les **tâches** permettent d’exécuter des scripts ou des commandes pour automatiser des tâches répétitives.
Dans le cadre de la Clean Architecture, nous sommes souvent amené à créer des fichiers interface et implémentation pour les **Use Cases** (pour répondre au principe d'Inversion de dépendance).
On peut automatiser la création de fichiers multiples (interface + impl) grâce à des scripts Dart invoqués par des **tâches**.  
Dans votre fichier `.vscode/tasks.json` :

.. code-block:: json

   {
     "version": "2.0.0",
     "tasks": [
       {
         "label": "Create Use Case",
         "type": "shell",
         "command": "dart",
         "args": ["run", "scripts/create_usecase.dart", "${input:useCaseName}"],
         "problemMatcher": []
       },
     ],
     "inputs": [
       {
         "id": "useCaseName",
         "type": "promptString",
         "description": "Nom du Use Case (par ex. ClearTokenFromLocalStorage)"
       },
     ]
   }

Ensuite :

1. Ouvrez la palette de commande (Ctrl+Shift+P / Cmd+Shift+P).
2. Sélectionnez “Tasks: Run Task”.
3. Choisissez la tâche (ex. “Create Use Case”).
4. Indiquez le nom (ex. “AjouterObservation”).

VS Code exécutera alors le script Dart (dans `scripts/`) qui générera 
les deux fichiers (interface + impl) dans les dossiers appropriés.

Snippets VS Code
================

Les **snippets** permettent d’insérer rapidement du code générique.

Pour créer un snippet, créer un fichier lié à votre projet. Pour cela ouvrez la palette de commande (Ctrl+Shift+P / Cmd+Shift+P) et sélectionnez “Snippets: Configure Snippets”, puis cliquez sur “New Snippets file for ”.
Cela vous permet de créer un fichier avec l’extension `.code-snippets` dans le dossier `.vscode/` de votre projet.

.. code-block:: json

  {
    "Create a Model": {
      "prefix": "model_freezed",
      "body": [
        "import 'package:freezed_annotation/freezed_annotation.dart';",
        "",
        "part '${1:model_name}.freezed.dart';",
        "part '${1:model_name}.g.dart';",
        "",
        "@freezed",
        "class ${2:ModelName} with _$${2:ModelName} {",
        "  const factory ${2:ModelName}({",
        "    required int id,",
        "    required String name,",
        "    // TODO: Add more fields",
        "  }) = _${2:ModelName};",
        "",
        "  factory ${2:ModelName}.fromJson(Map<String, dynamic> json) =>",
        "      _$${2:ModelName}FromJson(json);",
        "}"
      ],
      "description": "Create a new Freezed model class"
    },
  }

Ainsi, en tapant ``model_freezed`` dans un fichier Dart, VS Code insérera ce code type.  

Conclusion
==========

Avec les **snippets** et les **tâches**, vous évitez de reproduire du boilerplate 
et conservez une architecture cohérente. Vous pouvez combiner ceci avec vos propres règles 
de code, linting, ou autres outils pour un flux de travail **plus rapide et fiable**.

----

**Prochaines étapes** :
- Ajouter plus de snippets pour d’autres types de fichiers (widgets, viewmodels, etc.).
- Personnaliser les scripts pour gérer plus de cas (ex. migrations, tests, etc.).
- Intégrer des checklists de code review pour assurer la qualité.

