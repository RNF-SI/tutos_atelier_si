# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Nature du dépôt

Documentation Sphinx (reStructuredText, langue `fr`) des tutos de l'atelier « Systèmes d'Information en réseau » de Réserves Naturelles de France. Il n'y a **aucun code applicatif, aucun test, aucun linter** : chaque page est le support d'un atelier (vidéo YouTube, PDF de présentation, captures, pas-à-pas). La rédaction se fait en français.

## Commandes

Toujours travailler dans l'environnement virtuel (`source venv/bin/activate`) ; `sphinx-build` n'est pas installé globalement.

```bash
python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
```

- `make livehtml` — serveur de dev avec rebuild auto, sur **http://127.0.0.1:8100** (le port 8000 mentionné dans `contribuer.rst` est obsolète).
- `make html` — build unique dans `build/` (non versionné) ; ouvrir `build/html/index.html`.
- `make help` — cibles Sphinx disponibles (latexpdf, epub…).
- `make.bat` est l'équivalent Windows (sans `livehtml`).

Il n'y a pas de CI : le seul contrôle qualité est la sortie de `sphinx-build` (warnings sur titres mal soulignés, références cassées, images manquantes) et une relecture visuelle du HTML.

## Structure et conventions

- `source/conf.py` — configuration unique. Thème `sphinx_rtd_theme`, en-tête vert `#2b8a5cff`, logo `_static/Logo_RNF_blanc.png`. `setup(app)` injecte `_static/workshop.css` sur **toutes** les pages.
- `source/index.rst` — le `toctree` est la table des matières du site **et la liste des contributeurs**. Un nouveau `.rst` n'apparaît que s'il y est ajouté ; l'ordre du toctree est chronologique par atelier, donc les nouveaux tutos vont en fin de liste.
- `source/<sujet>.rst` — un fichier par atelier, à plat (pas de sous-dossiers).
- `source/_static/<sujet>/` — un sous-dossier d'assets par tuto (images, `.pdf`, `.webm`, `.mp4`). Respecter ce nommage pour tout nouvel asset.
- `source/_templates/` n'existe pas encore, bien que déclaré dans `templates_path`.

### Titre de page

Les titres de niveau 1 portent la date de l'atelier, c'est la convention du dépôt :

```rst
=================================================
Virtualiser avec ProxMox (Atelier du 29 mai 2024)
=================================================
```

### Directives d'extensions disponibles

Ces extensions sont activées dans `conf.py` et déjà utilisées :

- `.. youtube:: <id>` — enregistrement de l'atelier, quasi systématique juste après le titre (`sphinxcontrib.youtube`).
- `sphinxcontrib.pdfembed` — support de présentation embarqué, sous la vidéo :

  ```rst
  :pdfembed:`src:_static/<sujet>/support.pdf, height:420, width:100%, align:middle`
  ```
- `.. video:: ./_static/<sujet>/x.webm` — captures d'écran animées (`sphinxcontrib.video`).
- `.. contents:: Table des matières` avec `:local:` / `:depth: 2` — sommaire en tête des tutos longs.
- `sphinx_copybutton` ajoute automatiquement le bouton de copie sur les blocs de code ; ne rien faire de particulier.

### Mise en page riche (tutos workshop)

`workshop.css` définit des classes réutilisables, invoquées via `.. container:: <classe>` (préféré) ou `.. raw:: html` pour les mises en page complexes : `info-box`, `prereq-box`, `setup-step`, `option-card` / `dev-options-grid` / `option-header` / `option-content` / `option-icon`, `badge-recommended` / `badge-alternative`, `section-separator`, `annexes`. Voir `workshop_mobile_monitoring.rst` et `gn_monitoring.rst` comme références. Éviter d'introduire de nouvelles classes CSS sans les ajouter à `workshop.css`, qui est chargé globalement.

## Contribution

`main` est protégée en écriture : travailler sur une branche dédiée puis ouvrir une pull request sur https://github.com/RNF-SI/tutos_atelier_si. `source/contribuer.rst` est le guide destiné aux contributeurs (installation, syntaxe reStructuredText) — le mettre à jour si le workflow ou les commandes changent.
