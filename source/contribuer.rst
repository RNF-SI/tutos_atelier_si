Contribuer à cette documentation
================================

Vous pouvez contribuer à la documentation des tutos de l'atelier SI, soit parce que vous animez un atelier et présentez des outils, soit parce que vous souhaitez partager des infos sans pouvoir faire une présentation. 
Ces explications vous indiquent la démarche à suivre pour contribuer :

Poser une question
-------------------

Pour poser une question, rendez-vous sur la page GitHub du du projet ``tutos_atelier_si`` et poser votre question dans une nouvelle `Issue <https://github.com/RNF-SI/tutos_atelier_si/issues>`_

Récupération des fichiers
-------------------------

Les fichiers sont sur le gitHub de RNF, `dans un repositorie publique <https://github.com/RNF-SI/tutos_atelier_si>`_. Vous pouvez cloner le repo sur votre PC avec les outils git :

.. code-block:: bash

    cd /mon/dossier/cible
    git clone https://github.com/RNF-SI/tutos_atelier_si.git


Mettre en place l'environnement virtuel
---------------------------------------

Vous devez ensuite créer l'environnement virtuel. Commencez par installer python et venv si vous ne les avez pas déjà :

.. code-block:: bash 


    sudo apt install build-essential python3 python3-pip python3-venv


Ensuite créez votre environnement virtuel dans le dossier tutos_atelier_si

.. code-block:: bash 

    cd tutos_atelier_si
    python3 -m venv venv

Enfin, entrez dans votre environnement virtuel et installez les paquets nécessaires :

.. code-block:: bash

    source venv/bin/activate
    pip install -r requirements.txt

Vous pouvez utiliser ``deactivate`` pour quitter l'environnement virtuel, mais veillez bien à être dedans lorsque vous lancerez les commandes de sphinx. 

Contribuer au projet
--------------------

Créer une nouvelle branche
~~~~~~~~~~~~~~~~~~~~~~~~~~

    La branche main est protégée en écriture, vous ne pourrez pas directement pusher vos modifications dessus. Vous devez donc, dans un premier temps, créer votre propre branche de travail :

    .. code-block:: bash

        git checkout manouvellebranche

    Vous pouvez bien sûr le faire directement depuis votre éditeur de code en clic bouton s'il le permet (comme vscode par exemple).

    Une fois dans votre branche, vous pouvez effectuer les modifications que vous souhaitez. 

Créer un nouveau tuto
~~~~~~~~~~~~~~~~~~~~~

    Si vous souhaitez créer un nouveau tuto, ajouter un fichier .rst dans le dossier source (montuto.rst).

    Vous devez ensuite l'ajouter au fichier index.rst pour qu'il soit référencé dans l'arboressance :

    .. code-block:: RST 

        .. toctree::
            contribuer
            montuto

    L'arboressance reprendra les titres et sous-titres de votre fichier (vous verrez juste après comment créer des titres et sous-titres dans votre fichier).

Génération des fichiers HTML
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    Dès que vous ajoutez du contenu (voir section suivante), et si vous voulez voir à quoi ça ressemble, lancez la commande de compilation de sphinx :

    .. code-block:: bash

        make html

    Ensuite, lancez simplement le fichier ``index.html`` dans votre navigateur préféré, et admirez votre travail. 


Automatique Génération des fichiers HTML
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    | Vous pouvez également faire en sorte que le code HTML soit automatiquement régénéré, chaque fois que vous enregistrez une modification. 
    | Cela vous permet de garder le projet ouvert dans votre navigateur et d'afficher les modifications immédiatement. 

    .. code-block:: bash

        make livehtml

    Les pages HTML générées seront par défaut généré sur l'adresse http://127.0.0.1:8000.

Enregistrer / Partager le nouveau tuto
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    Pensez à faire régulièrement des commit de votre travail, soit en clic bouton avec votre éditeur, soit avec la commande suivante :

    .. code-block:: bash

        git commit -m 'message du commit'

    Une fois votre travail terminé, vous pouvez le push sur le github :

    .. code-block:: bash

        git pull
        git push

    Il faudra ensuite aller sur GitHub pour faire une pull-request, afin que j'ajoute votre contribution au contenu global. Encore une fois, certains éditeurs comme VScode permettent de faire des pullrequest directement depuis l'outil.

reStructuredText
----------------

Le contenu de cette section est entièrement copié de `cette page du blog de FLOZz <https://blog.flozz.fr/2020/09/07/introduction-a-sphinx-un-outil-de-documentation-puissant/>`_, qui a décrit à la perfection la manière d'écrire du contenu en reStructuredText. N'hésitez pas à aller visiter son blog !

La syntaxe utilisée pour rédiger une documentation avec Sphinx s'appelle reStructuredText. Si vous êtes habitués au Markdown, vous verrez que cette syntaxe est beaucoup plus complète, mieux normalisée, mais aussi plus stricte.

Je pourrais vous écrire un article complet sur le reStructuredText tellement la syntaxe est complète. Mais comme ce n'est pas le sujet principal de cet article, je vous montre rapidement les principaux formatages, sans vous expliquer toutes les subtilités.

Voici quelques formatages inline : 

.. code-block:: RST

    Voici du texte en *italique*, en **gras**, et voici du ``code inline``.

Pour faire des liens, c'est aussi assez simple (notez bien l'espace avant le "<", il est très important) :

.. code-block:: RST

    Pour faire un lien inline c'est simple :
    lien vers le `blog de FLOZz <https://blog.flozz.fr/>`_

Voici comment on fait des paragraphes en reStructuredText :

.. code-block:: RST

    Ceci est un paragraphe. Je peux retourner à la ligne, je
    serais toujours dans le même paragraphe.

    Pour écrire un second paragraphe, il suffit de le séparer
    du premier par une ligne vide.

Pour organiser son contenu, il peut être utile d'utiliser des titres. En reStructuredText, il suffit de souligner une ligne pour faire un titre :

.. code-block:: RST

    Titre principal
    ===============

    Titre de niveau 2
    -----------------

    Titre de niveau 3
    ~~~~~~~~~~~~~~~~~

    Un autre titre de niveau 2
    --------------------------

Ici je vous ai mis ma façon de faire (qui est relativement répendue) mais vous pouvez utiliser pas mal de caractères différents pour souligner vos titres (=-~_#^+<>:'"...), le parseur se débrouillera pour déterminer le niveau du titre en fonction de l'ordre d'apparition des symboles ; le tout c'est de rester cohérent.

Besoin d'une liste à puce ou ordonnée ?

.. code-block:: RST

    Liste à puce :

    * Ceci est une liste
    * un autre élément
    * un dernier élément

    Liste ordonnée :

    1. Un
    2. Deux
    3. Trois

    Une autre liste ordonnée :

    #. Un
    #. Deux
    #. Trois    

Résultat : 

Liste à puce :

* Ceci est une liste
* un autre élément
* un dernier élément

Liste ordonnée :

1. Un
2. Deux
3. Trois

Une autre liste ordonnée :

#. Un
#. Deux
#. Trois   

Dans une documentation on a souvent besoin d'écrire du code :

.. code-block:: RST

    Voici comment faire un bloc que code simple ::

        Ceci est un bloc de code. Il est créé grâce aux doubles deux-points.

    On peut également placer les doubles deux-points seuls si on ne veut pas
    terminer sa phrase par ce symbole.

    ::

        Voici un autre bloc de code...

    Et c'est pas fini ! On peut aussi définir un bloc de code avec une syntaxe
    plus explicite, grâce à laquelle on peut indiquer à Sphinx dans quel
    langage il est rédigé, ce qui lui permettra d'activer la coloration
    syntaxique :

    .. code-block:: python

        #!/usr/bin/env python

        print("Ceci est un bloc de code Python\n")

Si vous voulez mettre en évidence des notes, des avertissements ou des choses importantes, c'est également possible :

.. code-block:: RST

    .. NOTE::

        Ceci est une note.

    .. WARNING::

        Ceci est un avertissement !

    .. IMPORTANT::

        Ceci est important !

Résultat :

.. NOTE::

    Ceci est une note.

.. WARNING::

    Ceci est un avertissement !

.. IMPORTANT::

    Ceci est important !

Il est également possible d'ajouter des images (après l'avoir déposée dans le dossier _static) :

.. code-block:: RST

    Voici une image :

    .. figure:: ./_static/image.png

    Voici un autre image avec quelques paramètres en plus :

    .. figure:: ./_static/image.png
        :alt: Texte alternatif
        :target: http://blog.flozz.fr/
        :width: 400px
        :align: center

        Texte affiché sous l'image

Et pour les plus fifou d'entre vous, il est également possible de faire des tableaux, avec des cellules fusionnées et tout ! Et pour faire ça, il suffit simplement de dessiner le tableau tel qu'on veut le voir s'afficher :

.. code-block:: RST

    +-----------+-----------+-----------+
    | Heading 1 | Heading 2 | Heading 3 |
    +===========+===========+===========+
    | Hello     | World     |           |
    +-----------+-----------+-----------+
    | foo       |                       |
    +-----------+          bar          |
    | baz       |                       |
    +-----------+-----------------------+

Résultat : 

+-----------+-----------+-----------+
| Heading 1 | Heading 2 | Heading 3 |
+===========+===========+===========+
| Hello     | World     |           |
+-----------+-----------+-----------+
| foo       |                       |
+-----------+          bar          |
| baz       |                       |
+-----------+-----------------------+

Sachez qu'en plus des éléments de syntaxe standards de reStructuredText, Sphinx rajoute de nombreux éléments supplémentaires pour les besoins de la documentation.

On a pu voir par exemple toctree un peu plus tôt, mais il y a également des syntaxes pour effectuer des références entre des éléments de la doc, des syntaxes pour documenter des classes, des fonctions,...

Je vous en dis pas plus pour cette fois-ci, et allez voir `la documentation de Sphinx <https://www.sphinx-doc.org/en/master/usage/restructuredtext/basics.html>`_ pour en apprendre davantage. 
