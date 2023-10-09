Développer un plugin Qgis (Atelier du 27 avril 2023)
====================================================

..  youtube:: cGTKgTH-Vsk

| source `geotribu <https://static.geotribu.fr/articles/2010/2010-09-23_creer_ses_propres_plugin_qgis/>`_ (un peu ancienne mais qui donne une trame)
| source `docs.qgis <https://docs.qgis.org/3.28/fr/docs/pyqgis_developer_cookbook/plugins/plugins.html#getting-started>`_

**A savoir :**

   - Dans un QGIS configurer en Français, un plugin est appelé une ``Extensions``. 
   - Une fois développé, le plugin s'intalle et se met à jour au travers du gestionnaire d'Extensions.

   .. image:: /_static/qgis_builder/extensions.png


Installer les extensions QGIS
-----------------------------

Installer ``Plugin Builder 3`` |logo_pluginBuilder|
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Plutôt que de créer l'ensemble des fichiers nécessaires manuellement, l'extension ``Plugin Builder 3`` permet de générer un "squelette" de plugin QGIS !

   1. Allez dans "Extensions"
   2. Puis "Installer/Gérer les extensions"
   3. Installer l'extension ``Plugin Builder 3``

Installer ``Plugin Reloader``  |logo_pluginReloader|
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

   .. |logo_pluginReloader| image:: /_static/qgis_builder/logo_pluginReloader.png
      :height: 30
      :width: 30

| En phase de développement, vous allez effectuer (je l'espère) de nombreuses modifications. 
| Le plugin ``Plugin Reloader`` permet d'éviter d'avoir à redémarrer QGIS ou recharger le plugin après chaque modification d'un fichier.

   1. Allez dans "Extensions"
   2. Puis "Installer/Gérer les extensions"
   3. Installer l'extension ``Plugin Reloader``

Créer sa première extension (`docs.qgis <https://docs.qgis.org/3.28/fr/docs/pyqgis_developer_cookbook/plugins/plugins.html#getting-started>`_)
-----------------------------------------------------------------------------------------------------------------------------------------------

Définition du plugin
~~~~~~~~~~~~~~~~~~~~

   Ouvrir l'extension ``Plugin Builder 3`` |logo_pluginBuilder|, et compéter les différentes étapes du formulaire.

   .. |logo_pluginBuilder| image:: /_static/qgis_builder/logo_pluginBuilder.png
      :height: 30
      :width: 30

   **1. Prédéfinir les métadonnées et le squelette de votre plugin.**

      .. NOTE::

         Les métadonnées sont customisables, une fois votre plugin défini. Pour cela, éditer et customiser le fichier ``metadata.txt`` situé à la racine du dossier du plugin nouvellement créé.
      
      Toutes les métadonnées contenues dans ce fichier doivent être encodées en UTF-8.

      La liste des éléments s'observe `là <https://docs.qgis.org/3.28/fr/docs/pyqgis_developer_cookbook/plugins/plugins.html#writing-plugin-code>`_.  


      | ``Class name``        Nom de la class Python qui figurera dans le fichier `MonPlugin.py`. Cette class est importée dans le fichier __ini__.py de votre plugin.
      | ``Plugin name``       Titre de votre plugin qui sera lu par les utilisateurs.
      | ``Description``       Description de votre plugin. Texte court qui décrit le plugin, pas d” HTML autorisé.
      | ``Module name``       Nom que prendra votre fichier `monPlugin.py`.
      | ``Version number``    Numéro de version de votre plugin.
      | ``Minimum QGIS version``  Version minimal requise par Qgis pour que votre plugin fonctionne. 
      | ``Author/Compagny``   Nom du dévelopeur (le votre) ou celui de votre structure. Ou les deux !
      | ``Email adress``      Adresse email de la personne chargée de maintenir le bon fonctionnement du module.

      .. image:: ./_static/qgis_builder/capture_pluginBuilder.png

   |
   | **2. A propos de votre plugin**

      Texte plus long qui décrit le plugin en détail, pas de HTML autorisé.
      Vous pouvez noter ici tout ce que vous désirez décrire à propos de votre plugin, cette zone de texte sera lue par les utilisateurs.

   **3. Choix du modèle**

      Sélectionner le type de modèle désiré : 
         * Tool button with dialog   (Modèle choisi pour la présentation)
         * Tool button with dock widget
         * Processing Provider

      ``Text for the menu item``  Text bref apparaissant au survol de l'icon du plugin, lorsque ce dernier est installé dans les Extensions QGIS.

   **4. Choix des différents éléments à générer.**

      Par défaut, tout est sélectionné, ce n'est pas gênant. 

      Si vous ne savez pas trop quoi faire à cette étape, laissez les choses comme telles et passez à l'étape suivante.

   **5. Définition des redirections.**

      | ``Bug tracker`` Lien vers la page des tickets de votre plugin (exemple : https://unePlateformeGit.ex/monCompte/monPlugin/Issues)
      | ``Repository``  Lien vers le dépot officiel de votre plugin (exemple : https://unePlateformeGit.ex/monCompte/monPlugin)
      | ``Home page``   Lien vers la documentation officielle de votre plugin (exemple : https://si-en-reseau.reserves-naturelles.org/tutos/qgis_builder.html)
      | ``Tags``    Liste des étiquettes de votre plugin, permettant son référencement dans la listes des extensions disponibles à votre QGIS.

   **6. Select Output Directory**
      
      Enregistrer votre nouveau plugin dans le dossier de votre choix.


Création de l'interface graphique (frontend)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

   Suite à la génération de votre plugin, vous pouvez maintenant customiser son interface utilisateur. Si votre plugin n'est pas encore généré, reportez-vous au sous-chapitre `Définition du plugin`_ (ci-dessus).

   Deux solutions s'offrent maintenant à vous :
   -  Soit modifier le fichier monPlugin.py en codant les différents que vous souhaitez ;
   -  Utiliser le programme QT Designer. Ce dernier permet de dessiner vos éléments puis de générer ensuite le code correspondant.
   C'est cette dernière solution qui est décrite au sein de cette doc.

   **1. Ouvrir le fichier** ``.ui`` **de votre plugin à l'aide de l'application** ``QT Designer`` (application faisant partie de la suite QGIS).

      .. video:: ./_static/qgis_builder/capture_openQT.webm
         :height: 323
         :width: 648

   |
   | **2. Créer votre formulaire de toutes pièces.**

      | Insérer les éléments de votre choix, à partir de la ``Boite de widget`` (panneau de gauche), pour constituer votre interface utilisateur. 
      | Chaque élément doit posséder un nom d'objet unique. Pensez à les renommer après chaque ajout, au sein de l'``Inspecteur d'object`` (panneau en haut à droite), de sorte à pouvoir les identifier par la suite.  

      Chaque élément est graphiquement paramétrable au sein de l'``Éditeur de propriété`` (panneau du milieu à droite).


   **3. Compiler les ressources (icones, images, ...)**

   Pour compiler les ressources, il est nécessaire de créer un fichier python à l'aide de la commande ``pyrcc5``.

      - Sous Windows, il est nécessaire de créer un fichier exécutable batch ``compile.bat``.

         `Adapter la version de QGIS` ``QGIS 3.30.1`` `et de Grass` ``grass82`` `avec celles de votre installation.`

         .. code-block:: batch

            @ECHO OFF

            set OSGEO4W_ROOT=C:\\Program Files\\QGIS 3.30.1

            set PATH=%OSGEO4W_ROOT%\bin;%PATH%
            set PATH=%PATH%;%OSGEO4W_ROOT%\apps\qgis\bin

            @echo off
            path %OSGEO4W_ROOT%\apps\qgis-dev\bin;%OSGEO4W_ROOT%\apps\grass\grass82\lib;%OSGEO4W_ROOT%\apps\grass\grass82\bin;%PATH%

            cd /d %~dp0

            @ECHO ON 
            ::Resources
            call pyrcc5 -o resources.py resources.qrc



Installation d'un plugin fraichement développé
----------------------------------------------

   .. NOTE::
      | Lors de l'installation de votre plugin, si vous rencontrez le message d'erreur suivant :
      | ``ModuleNotFoundError: No module named 'resources_rc'``
      |  - Editer votre fichier ``monPlugin_dialog_base.ui``, 
      |  - Supprimer la ligne ``<include location="resources.qrc"/>``,
      |  - Recommencer votre procédure d'installation.

Depuis un ZIP
~~~~~~~~~~~~~~
   1. Zipper votre dossier projet.
   2. Ouvrir QGIS, allez dans « Extensions » puis « Installer/Gérer les extensions ».
   3. Dans le menu de droite, sélectionnez l'onglet « Installer depuis un ZIP ».
   4. Ouvrer votre dossier ZIP et cliquer sur « Installer le plugin ».

Depuis un dépot Serveur / Git
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   1. Publier votre plugin fraichement conçu sur un serveur (serveur de fichier ou plateforme Git)
   2. Créer un fichier HTML dans lequel sera lister l'ensemble de vos plugins (illustré ci-dessous) :

      .. code-block:: html

         <-- Exemple de fichier HTML -->
         <?xml version='1.0' encoding = 'UTF-8'?>
         <plugins>
            <pyqgis_plugin name="mon plugin" version="1.0">
               <description><![CDATA[ ... ]]></description>
               <about><![CDATA[ ... ]]></about>
               <version>1.0</version>
               <qgis_minimum_version>3.0</qgis_minimum_version>
               <homepage>https://doc.de.monPlugin.fr/</homepage>
               <file_name>monDossier</file_name>
               <icon>uneImage.png</icon>
               <author_name>Jean-Jacque</author_name>
               <download_url>file:///Z:\CHEMIN\DE\MON\DOSSIER\ZIP\monDossier.zip</download_url>
               <uploaded_by>Medi</uploaded_by>
               <create_date>2022-09-13</create_date>
               <update_date>2022-09-29</update_date>
               <experimental>False</experimental>
               <deprecated>False</deprecated>
               <tags>Python,RNF, ... </tags>
            </pyqgis_plugin>
            <pyqgis_plugin name="mon autre plugin" version="1.0">
               <description><![CDATA[ ... ]]></description>
               <about><![CDATA[ ... ]]></about>
               <version>0.1</version>
               <trusted>True</trusted>
               <qgis_minimum_version>3.0</qgis_minimum_version>
               <qgis_maximum_version>3.99.0</qgis_maximum_version>
               <homepage>https://doc.de.monAutrePlugin.fr/</homepage>
               <file_name>monAutrePlugin.zip</file_name>
               <icon>icon.png</icon>
               <author_name>Maély</author_name>
               <download_url>https://framagit.org/.../.../monAutrePlugin.zip</download_url>
               <uploaded_by>Amina</uploaded_by>
               <create_date>2022-09-13</create_date>
               <update_date>2022-09-29</update_date>
               <experimental>False</experimental>
               <deprecated>False</deprecated>
               <tracker>https://framagit.org/.../.../monAutrePlugin/issues</tracker>
               <repository>https://framagit.org/.../.../monAutrePlugin</repository>
               <tags>Python,RNF, ... </tags>
               <downloads></downloads>
               <average_vote></average_vote>
               <rating_votes></rating_votes>
               <external_dependencies></external_dependencies>
               <server></server>
            </pyqgis_plugin>
            ...
         </plugins>

   3. Dans le menu de droite, sélectionnez l'onglet « Paramètres ».
   4. Ajouter un nouveau dépot en saisissant la localité de votre fichier HTML.

Besoin de modifications, où trouver mon plugin ?
------------------------------------------------

   Vous l'avez probablement perçu, une fois installé un plugin en développement a très souvent besoin d'être modifié, adapté, paufiné. Pour se faire, il est souvent plus confortable d'aller modifier votre plugin directement dans les dossiers de QGIS. Ainsi, à chaque modification d'un fichier, il vous suffira de recharger votre plugin à l'aide de ``Plugin Reloader`` pour constater le résultat.

   Pour identifier le dossier d'installation de votre plugin : 

   - Ouvrez le gestionnaire d'extensions ``Extensions > Installées``.
   - Cliquer sur le numéro de version en face de la variable ``Version installée  X.Y.Z``.

      .. image:: ./_static/qgis_builder/version_installee.png

Customisation de l'interface graphique (frontend)
-------------------------------------------------

   Ouvrez le fichier ``.ui``  de votre plugin (cf. `Besoin de modifications, où trouver mon plugin ?`_), installé dans votre QGIS, à l'aide de QT Designer.


      .. video:: ./_static/qgis_builder/custom_frontend.webm
         :height: 323
         :width: 648

      .. NOTE::
         Pensez à configurer l'extension `Plugin Reloader` sur votre plugin.

   | - `Insérer une image` :   Insérer un widget ``Label`` dans votre formulaire. Dans l'``Éditeur de propriété`` du label nouvellement inséré, charger votre image dans la variable ``QLabel > pixmap``.


   | - `Insérer une authentification` : Pour intégrer une authentification à votre plugin, vous avez deux solutions :
   |   - Insérer le widget ``QsgAuthConfigSelect``, permettra aux utilisateurs de sélectionner un identifiant stocké dans son coffre-fort de mot de passe.
   |   - Insérer le widget ``QLineEdit`` pour la saisie de l'identifiant et le widget ``QsgPasswordLineEdit`` pour la saisie du mot de passe.

Codage des process (backend) PyQGIS
-----------------------------------

   Voici différentes ressources documentaires pouvant vous être utile dans votre développement :

   - source `docs.qgis.org/pyqgis_developer_cookbook <https://docs.qgis.org/3.28/fr/docs/pyqgis_developer_cookbook/cheat_sheet.html>`_
   - source `doc.qt.io <https://doc.qt.io/qtforpython/index.html>`_
   - source `qgis.org  <https://qgis.org/pyqgis/master/index.html>`_
   - source `pythonguis <https://www.pythonguis.com/tutorials/creating-your-first-pyqt-window/>`_
   - source `riverbankcomputing <https://www.riverbankcomputing.com/static/Docs/PyQt5/>`_


   Pour coder les processus de votre plugin, vous aurez besoin à minima de modifier le fichier ``monPlugin.py``.

   | Pour chaque éléments placés sur votre interface graphique, il vous faudra :
   |    - Soit, lui attribuer un objet PyQGIS (objet Python de qgis)
   |    - Soit, récupérer le résultat de l'objet.
   |    - Soit, les 2 mon capitaine !


Les variables utiles (`docs.qgis/pyqgis_developer_cookbook <https://docs.qgis.org/3.28/fr/docs/pyqgis_developer_cookbook/cheat_sheet.html#>`_)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

   | - ``iface`` Objet renvoyant à l'interface graphique.
   | - ``iface.mapCanvas()`` Objet premettant d'accèder au Canevas.
   | - ``iface.activeLayer()`` Objet identifiant la couche sélectionnée.
   | - ``QgsProject.instance().mapLayers().values()`` Objet listant les couche du projet.
   | - Et tellement d'autre encore ! Explorer la/les docs.

Activer le plugin à la sélection d'une couche spécifique
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

   .. code-block:: py
      
      class BankPlanGestion:
         """QGIS Plugin Implementation."""

         def __init__(self, iface):
            ...
            # Save reference to the QGIS interface
            self.iface = iface
            self.canvas = self.iface.mapCanvas()
            self.activeCouche = self.iface.activeLayer()
            
            ...

            self.canvas.selectionChanged.connect(self.toggle)
            self.iface.layerTreeView().currentLayerChanged.connect(self.toggle)
         

         def toggle(self):
            if self.iface.activeLayer():
               layer = self.iface.activeLayer().dataProvider().dataSourceUri(True)

               if layer == 'maCoucheSélectionnée':
                  self.actions[0].setEnabled(True)
               else:
                  self.actions[0].setEnabled(False)

            else:
               self.actions[0].setEnabled(False)


Récupérer les accès à une couche Postgis chargée
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

   .. code-block:: py

      class BankPlanGestion:
         """QGIS Plugin Implementation."""

         ...

         def get_param_postgisLayer(self):
            if self.iface.activeLayer():
               layer_names = [layer.name() for layer in QgsProject.instance().mapLayers().values()]

               if 'maTablePostgis' in layer_names:
                  layer = QgsProject.instance().mapLayersByName('maTablePostgis')[0].dataProvider().dataSourceUri(True)
                  self.user = layer.split("user='")[1].split("' ",1)[0]
                  self.password = layer.split("password='")[1].split("' ",1)[0]
                  self.dbname = layer.split("dbname='")[1].split("' ",1)[0]
                  self.host = layer.split("host=")[1].split(" ",1)[0]
                  self.port = layer.split("port=")[1].split(" ",1)[0]
               else :
                  self.user = None
                  self.password = None
                  self.dbname = None
                  self.host = None
                  self.port = None


Utiliser les icônes intégrées de QGIS pour égayer ses plugins (PyQGIS Icons Cheatsheet)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   | source `geotribu/articles/2023/2023-03-24 <https://static.geotribu.fr/articles/2023/2023-03-24_pyqgis-icones-cheatsheet-automatisation/?utm_campaign=feed-syndication&utm_medium=RSS&utm_source=rss-feed&utm_source=Geotribu&utm_campaign=7e395e4c85-RSS_EMAIL_CAMPAIGN_WEEKLY&utm_medium=email&utm_term=0_6c4efaf092-7e395e4c85-549540402>`_
   | source `pyqgis-icons-cheatsheet.geotribu <https://pyqgis-icons-cheatsheet.geotribu.fr/#themesdefault>`_
