Windows Sub-System Linux / Environnement virtuel / Flask (Atelier du 9 mars 2023)
==================================================================================

..  youtube:: 9mcMAR5bMXs 

Installer un sub-system Linux
-----------------------------

Un sous-système linux est un environnement linux directement intégré à Windows. Cela permet d'utiliser toutes les fonctionnalités de Linux, tout en étant dans un environnement windows familier, avec la possibilité de faire communiquer les deux (en utilisant par exemple le système de fichiers classique de windows).

Pour l'installer, vous devez ouvrir le terminal de commandes de windows (PowerShell) et taper la commande suivante :

.. code-block::

    #listez l'ensemble des os disponibles :
    wsl -l -o
    #pour installer une os en particulier (ici Debian, que je recommande):
    wsl --install -d Debian

Vous devez redémarer la machine pour finaliser l'installation. 

Vous pouvez ensuite accéder à votre terminal Debian en lançant l'application. 

Vous devrez alors définir un nom d'utilisateur et un mot de passe. 

.. NOTE::

    J'ai moi-même réalisé l'installation d'un WSL il y a un petit moment, à l'époque de WSL 1. A vérifier donc si ça marche bien.

    Une erreur peut arriver, c'est que la virtualisation ne soit pas activé sur votre machine. Dans ce cas, il faut aller dans le bios de votre pc et "enable Virtualization" ou "enable Hyper-V".

Commandes de base en Linux
--------------------------

Si vous n'avez pas l'habitude d'utiliser linux, voici quelques commandes de base sous ubuntu :

``ls`` permet de lister l'ensemble des fichiers et dossiers du répertoire dans lequel vous vous trouvez. Utilisez ``ls -l`` permet un affichage détaillé (permissions, taille...).

``cd`` pour change directory, vous permettra de vous déplacer dans votre système de fichiers linux. La commande seule vous emmenera directement au répertoire de l'utilisateur (/home/<nom_utilisateur>). ``cd ..`` vous fait remonter au dossier parent. ``cd /mon/chemin/absolu`` vous déplace dans le dossier voulu. ``cd mon/chemin/relatif`` vous déplace dans un sous-dossier de votre dossier actuel. 

.. NOTE::

    Très pratique, utilisez la touche ``TAB`` pour faire de l'auto-complétion de votre chemin. Par exemple, si vous commencer à taper ``cd /h`` et que vous appuyez sur ``TAB``, il complètera directement le chemin par la seule option disponible, à savoir ``cd /home/``. Si plusieurs options sont possible, il vous les affichera.

``mv`` (move), permet de déplacer un fichier. Par exemple ``mv dossier1/monfichier dossier2/monfichier`` déplacera le fichier du dossier 1 vers le dossier 2. Le chemin est ici relatif à votre position, dossier1 et dossier2 sont donc des emplacements enfant de votre position actuelle. Mais vous pouvez utiliser des positions absolues ``mv /home/utilisateur/dossier1/monfichier /home/<nom_utilisateur>/dossier2/mon fichier``. Vous pouvez également utiliser cette commande pour renommer un fichier ``mv monfichier nouveaunom``.

``cp`` (copy) permet de copier un fichier et s'utilise de la même manière que ``mv`` : ``cp monfichier monnouveaufichier`` dupliquera monfichier avec le nom monnouveaufichier.

``rm`` (remove) permet de supprimer un fichier. ``rm monfichier`` supprimera donc monfichier. ``rm -r`` supprimera tous les fichiers d'un dossier de manière récursive, donc tous les dossiers et fichiers enfants également. 

.. DANGER::

    Attention à l'utilisation de ``mv`` ou de ``rm``, ils suppriment et écrasent les fichiers sans demander de confirmation. 

``mkdir`` permet de créer des dossiers. ``mkdir photos`` créera un dossier photos dans le répertoire courant. ``mkdir -p photos/2005/noel`` créera le dossier noel et, s'ils n'existent pas, les dossiers 2005 et photos.

``rmdir`` permet de supprimer un dossier, à condition qu'il soit vide. ``rmdir dossier1`` supprimera dossier1 du répertoire courant. S'il n'est pas vide mais qu'on souhaite le supprimer, on utilisera ``rm -r dossier1``

``top`` montre la charge CPU.  Un peu comme le gestionnaire des tâches de windows, si vous souhaitez voir ce qui consomme toute votre RAM. 

``sudo`` vous donne les droits d'administrateur pour l'action donnée. Par exemple pour supprimer un fichier dont vous n'avez pas les droits, vous devez faire ``sudo rm monfichier``. Attention donc à son utilisation, et posez-vous bien la question de pourquoi vous n'avez pas les droits sur ledit fichier. 

``apt-get`` permet l'installation et la désinstalation de paquets (utilitaires), en tenant compte des dépendances ainsi que le téléchargement des paquets s'ils sont sur une source réseau. Il se combine avec sudo pour installer ces paquets au système avec les droits qui conviennent :

* ``sudo apt-get update`` met à jour la liste des paquets disponibles
* ``sudo apt-get upgrade`` met à jour tous les paquets installés
* ``sudo apt-get install paquet1 paquet2`` installe les paquets mentionnés
* ``sudo apt-get remove paquet1`` supprime ledit paquet

.. NOTE:: 

    Il existe tout plein d'autres commandes qui peuvent être utiles, n'hésitez pas à `consulter cette doc <https://doc.ubuntu-fr.org/tutoriel/console_commandes_de_base>`_.

Lorsque votre sous-système est installé, commencez par mettre à jour vos paquet.

Pour tester, installez ``htop``, qui est un utilitaire bien pratique et plus visuel que top pour montrer la charge CPU. Une fois l'installation terminée, tapez simplement ``htop`` pour le lancer. Faites ``ctrl + c`` pour quitter.

Vous pouvez accéder directement à vos fichiers windows depuis un sub-system. Pour cela le chemin absolu est ``/mnt/c/Users/<nom_utilisateur>/Documents/`` pour accéder à "Mes Documents".

Créer un environnement virtuel
------------------------------

Pour créer un environnement virtuel, nous allons utiliser virtualenv, qui est un paquet python. Un environnement virtuel permet de travailler plus proprement dans son système, en n'installant les paquets nécessaires à un projet que dans ledit projet. Cela présente également l'intéret de pouvoir identifier facilement les paquets nécessaires au fonctionnement d'un développement effectué, et de pouvoir les réinstaller tous d'un coup dans un environnement de production. 

Pour cela, commencez par installer les paquets nécessaires comme python, ou venv :

.. code-block:: bash

    sudo apt install build-essential python3 python3-pip python3-venv

Ensuite, lancez la commande suivante après vous être placé dans le dossier souhaité :

.. code-block:: bash

    python3 -m venv venv #le dernier venv sera le nom de l'environnement virtuel, donc comme vous voulez, mais c'est bien venv
    # j'en profites pour dire que derrière un dièse, on peut mettre des commentaires qui ne seront pas exécuté dans votre terminal ;)

Vous verrez apparaitre un dossier, nommé "venv" dans notre cas, qui contient toutes les infos des packages de l'environnement. 

.. WARNING::

    Il semble que sur Ubuntu, il y ait une erreur de retourné du type ``Error: Command '['/mnt/c/Users/../venv/bin/python3', '-Im', 'ensurepip', '--upgrade', '--default-pip']' returned non-zero exit status 1.``

    Pour la régler, supprimez d'abord le dossier "venv" créé avec ``rm -r venv/`` puis relancez la commande avec ``sudo`` : ``sudo python3 -m venv venv``. Mais après il y a un risque de problèmes de permissions... préférez donc debian a ubuntu

Une fois l'environnement créé, il faut l'activer :

.. code-block:: bash

    source venv/bin/activate

Vous verrez alors apparaitre le nom de votre environnement virtuel devant votre utilisateur sur le terminal. 

Veillez à ce qu'il soit toujours bien activé lorsque vous installez des packages spécifiques à votre projet, sinon ils s'installeront globalement sur votre linux. 

Une fois dans votre terminal, vous pouvez installer vos packages python avec la commande ``pip`` que nous allons voir plus loin. 

Initier un projet Flask
-----------------------

La première chose à faire est d'installer Flask, avec la commande suivante :

.. code-block:: bash

    #on s'assure d'être bien dans l'environnement virtuel avant d'installer flask
    pip install flask

Ensuite, créez un fichier ``app.py`` qui contient les lignes de code suivantes : 

.. code-block:: python 

    from flask import Flask

    app = Flask(__name__)


    @app.route('/')
    def hello():
        return 'Hello, World!'

Vous pouvez ensuite lancer votre instance flask en tapant dans votre terminal la commande suivante :

.. code-block:: bash

    flask run

Vous constaterez que les messages suivant arrivent dans votre terminal :

.. code-block:: bash

    * Debug mode: off
    WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
    * Running on http://127.0.0.1:5000
    Press CTRL+C to quit

Votre instace flask est en route (monopolisant alors le terminal), et vous pouvez accéder à votre application en allant sur l'adresse par défaut http://127.0.0.1:5000.

Vous pouvez stopper flask en tappant ``CTRL+C``.

Afin d'avoir un retour de tous les messages d'erreur, tapez la commande ``export FLASK_DEBUG=1`` dans votre terminal. 

En relançant, vous constaterez que le debugger est maintenant actif. 

Pour se mettre directement en configuration de production (ce qui peut être utile si on veut à terme déployer l'appli sur une serveur.), on passe par un fichier intermédiaire.

Créez un nouveau fichier ``wsgi.py`` contenant le code suivant :

.. code-block:: python

    from app import app

    if __name__ == '__main__':
        app.run(host='0.0.0.0', port=5000)
        app.run()

Lancez ensuite flask avec la commande suivante :

.. code-block:: bash

    python wsgi.py

En cas de mise en production, il suffira de créer un service basé sur ce fichier, et vous pouvez directement y définir votre port (si vous avez plusieurs app et que le port 5000 est occupé).

Vous pouvez créer du Front directement avec Flask, notamment avec la fonction render_template :

.. code-block:: python

    from flask import Flask, render_template

    app = Flask(__name__)

    @app.route('/')
    def index():
        return render_template('index.html')

Flask va donc retourner le fichier ``index.html``, que vous aurez placé dans un dossier templates, lors de l'appel de l'url de l'application http://127.0.0.1:5000. 

Vous pouvez bien sûr retourner des pages bien plus complexes, qui vont chercher les données dans une base de données. 

UsersHub et TaxHub sont construits avec Flask, Front compris. GeoNature n'a que son Back qui est construit sous Flask.

Créer une base de données avec SQLAlchemy et Alembic
----------------------------------------------------

SQLAlchemy est une bibliothèque python qui permet de manipuler plus facilement des bases de données relationnelles, comme PostgreSQL. Flask_sqlalchemy est la bibliothèque dédiée à Flask.

Marshmallow est une bibliothèque python qui simplifie le rendu de bases de données. Flask-Marshmallow est la bibliothèque dédiée à Flask.

Alembic est une bibliothèque python qui permet de gérer les versions de bases de données, et d'effectuer des modifications dans la base de données. Flask-Migrate est la bibliothèque d'Alembic dédiée à Flask. 

Psycopg2 est un adpateur python de bases de données pour PostgreSQL, nécessaire si vous souhaitez utiliser ce SGBD.

Installez d'abord ces bibliothèques :

.. code-block:: bash

    pip install Flask-SQLAlchemy Flask-Marshmallow marshmallow-sqlalchemy Flask-Migrate psycopg2

On modifie notre fichier app.py pour initialiser SQLAlchemy, Marshmallow et Alembic :

.. code-block:: python

    from flask import Flask
    from flask_sqlalchemy import SQLAlchemy
    from flask_marshmallow import Marshmallow
    from flask_migrate import Migrate

    from config import Config

    app = Flask(__name__)
    app.config.from_object(Config)

    db = SQLAlchemy(app)
    ma = Marshmallow(app)
    migrate = Migrate(app, db)

Vous notterez que j'importe ici une classe ``Config`` d'une bibliothèque ``config``. Celle-ci va permmettre de stocker des informations de configuration dans un autre fichier, dans lequel pourront se trouver des informations sensibles à ne pas diffuser (commes des mots de passe). Ce fichier pourra donc être ajouté au .gitignore si on publie le code sur GitHub par exemple.

Créez donc un nouveau fichier config.py avec le contenu suivant : 

.. code-block:: python

    class Config :
        SQLALCHEMY_DATABASE_URI = "postgresql://postgres:postgres@localhost/test"
        #typebdd://username:password@server/db

Vous devez ensuite créer des models pour décrire vos tables de bases de données. 

Ajoutez une classe Users au fichier ``app.py`` :

.. code-block:: python

    from flask import Flask
    from flask_sqlalchemy import SQLAlchemy
    from flask_marshmallow import Marshmallow
    from flask_migrate import Migrate

    from config import Config

    app = Flask(__name__)
    app.config.from_object(Config)

    db = SQLAlchemy(app)
    ma = Marshmallow(app)
    migrate = Migrate(app, db)

    class Users(db.Model):
        id_user = db.Column(db.Integer, primary_key=True)
        nom = db.Column(db.String(255)) 
        prenom = db.Column(db.String(255)) 
        email = db.Column(db.String(255)) 
        actif = db.Column(db.Boolean)

Votre base de données doit déjà exister pour pouvoir l'administrer avec Alembic. Créez là donc comme vous en avez l'habitude avec les extensions que vous souhaitez. 

Vous devez ensuite initialiser Alembic, en tapant la commande suivante :

.. code-block:: bash

    flask db init

Vous pouvez constater la création d'un dossier ``migrations``, à ajouter également dans le .gitignore si utilisation de Git.

Vous pouvez ensuite générer le script de migration :

.. code-block:: bash

    flask db migrate -m 'Initial migration.' #le paramètres -m est optionnel mais vous permet d'identifier plus facilement vos fichiers de migration

Alembic détecte tout seul que vous avez ajouté la table Users, et produit, dans le dossiers migrations/versions un fichier de migration qui ressemble à ça :

.. code-block:: python 

    """Initial migration.

    Revision ID: 0d66a935150a
    Revises: 
    Create Date: 2023-02-28 12:31:36.443852

    """
    from alembic import op
    import sqlalchemy as sa


    # revision identifiers, used by Alembic.
    revision = '0d66a935150a'
    down_revision = None
    branch_labels = None
    depends_on = None


    def upgrade():
        # ### commands auto generated by Alembic - please adjust! ###
        op.create_table('users',
        sa.Column('id_user', sa.Integer(), nullable=False),
        sa.Column('nom', sa.String(length=255), nullable=True),
        sa.Column('prenom', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('actif', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id_user')
        )
        # ### end Alembic commands ###


    def downgrade():
        # ### commands auto generated by Alembic - please adjust! ###
        op.drop_table('users')
        # ### end Alembic commands ###

Les fonctions d'upgrade et de downgrade de la base sont créées. Comme indiqué dans le fichier, il vaut mieux aller vérifier le fichier et l'ajuster au besoin avant de lancer les fonctions (peut être nécessaire lors de l'utilisation de champs geométriques qu'il prend moins bien en charge). Ici tout va bien, on peut donc lancer la fonction d'upgrade comme suit :

.. code-block:: bash 

    flask db upgrade

Et voilà ! Votre table ``users`` a été créée dans le schéma public de votre base de données. Dès lors que vous modifier votre class Users ou que vous ajoutez d'autres tables, vous pouvez relancer la génération du script. Ajoutons par exemple une table ``Expertises``, avec une relation de n à n avec ``Users`` (et donc une table intermédiaire):

.. code-block:: python 

    from flask import Flask
    from flask_sqlalchemy import SQLAlchemy
    from flask_marshmallow import Marshmallow
    from flask_migrate import Migrate

    from config import Config

    app = Flask(__name__)
    app.config.from_object(Config)

    db = SQLAlchemy(app)
    ma = Marshmallow(app)
    migrate = Migrate(app, db)

    # Table de liaison n à n des utilisateurs avec les expertises
    cor_users_expertises = db.Table('cor_users_expertises',
        db.Column('user_id', db.Integer, db.ForeignKey('users.id_user')),
        db.Column('expertise_id', db.Integer, db.ForeignKey('expertises.id_expertise'))
    )

    class Users(db.Model):
        id_user = db.Column(db.Integer, primary_key=True)
        nom = db.Column(db.String(255)) 
        prenom = db.Column(db.String(255)) 
        email = db.Column(db.String(255)) 
        actif = db.Column(db.Boolean)
        expertises = db.relationship(
            'Expertises',
            secondary=cor_users_expertises
        )

    class Expertises(db.Model):
        id_expertise = db.Column(db.Integer, primary_key=True)
        nom_expertise = db.Column(db.String(255))   

Puis relancez la commande de génération du fichier de migration ``flask db migrate -m "Ajout de la table expertises"``. La fonction suivante est créée :

.. code-block:: python 

    def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('expertises',
    sa.Column('id_expertise', sa.Integer(), nullable=False),
    sa.Column('nom_expertise', sa.String(length=255), nullable=True),
    sa.PrimaryKeyConstraint('id_expertise')
    )
    op.create_table('cor_users_expertises',
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('expertise_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['expertise_id'], ['expertises.id_expertise'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id_user'], )
    )
    # ### end Alembic commands ###

On voit alors que deux tables sont créées, et que les contraintes de clés étrangères sont générées sur la table de correspondance. 

N'oubliez pas de lancer ``flask db upgrade`` pour effectuer les modifications en base de données.

Construction de l'API avec Flask
--------------------------------

Flask est très utile pour mettre en place une API, c'est à dire retourner des données à partir d'une URL. 

Pour cela, nous allons d'abord créer des schemas, qui permetent de définir la forme de renvoi des données (quels champs...). Ajoutez donc les lignes suivantes à la suite du fichier ``app.py``:

.. code-block:: python 

    class UsersSchema(ma.SQLAlchemyAutoSchema) :
        class Meta :
            model = Users
        expertises = ma.Nested(lambda :ExpertiseSchema, many = True)
        
    class ExpertiseSchema(ma.SQLAlchemyAutoSchema) :
        class Meta :
            model = Expertises

On voit que pour le schema UsersSchema, on a ajouté un champs qui n'existe pas dans notre cas de relation de n à n. On lui seulement que c'est un schéma imbriqué (nested), il va faire le lien entre les deux tables grâce aux clés étrangères.

On crée ensuite des routes pour appeler nos données (toujours à la suite de ``app.py``, mais on ajoute l'import de jsonify à partir de flask) :

.. code-block:: python

    from flask import Flask, jsonify

    #route pour récupérer les informations de l'ensemble des utilisateurs
    @app.route('/users', methods=['GET'])
    def getUsers():
        users = Users.query.filter_by(actif=True).all()
        schema = UsersSchema(many=True)
        usersObj = schema.dump(users)

        return jsonify(usersObj)

    #route pour récupérer les informations d'un utilisateur
    @app.route('/user/<id_user>', methods=['GET'])
    def getUser(id_user):
        user = Users.query.filter_by(id_user=id_user).first()
        schema = UsersSchema(many=False)
        userObj = schema.dump(user)

        return jsonify(userObj)

Ici deux routes ont été créées, avec la méthode 'GET' pour récupérer de la données. La première route renvoit tous les utilisateurs, en prenant le schema users défini (comprenant donc les expertises associées aux utilisateurs). La seconde route prend en paramètre id_user, et renvoi donc l'utilisateur qui répond à cet ID s'il existe.

Avant de les tester, il faut ajouter un peu de données à ces tables qui sont pour l'instant vides, avec par exemple ces quelques lignes SQL :

.. code-block:: SQL

    INSERT INTO users (nom, prenom, email, actif)
    VALUES('Dumond','Nestor', 'n.dumond@mail.com', true),
        ('Leclou','Geraldine', 'g.leclou@mail.com', true),
        ('Ayeb', 'Youssef', 'y.ayeb@mail.com', true),
        ('Martin', 'Marie', 'm.martin@mail.com', false);
        
    INSERT INTO expertises (nom_expertise)
    VALUES ('SIG'),('Developpement Web'), ('Administration système');

    INSERT INTO cor_users_expertises (user_id, expertise_id)
    VALUES (1,1),(1,2),(2,1),(2,3),(3,1),(4,2);

Lancez ensuite flask avec ``python wsgi.py``. Testez les URL http://127.0.0.1:5000/users et http://127.0.0.1:5000/user/1.

L'API retourne donc les objets demandés au format JSON, avec les expertises associées aux utilisateurs. Ces routes peuvent être utilisées par une application avec un Front écrit dans un tout autre langage, comme c'est le cas pour GeoNature.

Vous pouvez bien sûr ajouter d'autres types de routes avec les méthodes 'POST', 'PUT' ou 'DELETE', voir combiner les méthodes pour une même route :

.. code-block:: python 

    from flask import Flask, jsonify, request

    @app.route('/user/<id_user>', methods=['GET','PUT','DELETE'])
    def User(id_user):

        user = Users.query.filter_by(id_user=id_user).first()

        if request.method == 'GET':
        
            schema = UsersSchema(many=False)
            userObj = schema.dump(user)

            return jsonify(userObj)

        if request.method == 'PUT':
            
            data = request.get_json()

            user.nom = data['nom']
            user.prenom = data['prenom']
            user.email = data['email']
            user.actif = data['actif']

            db.session.commit()
            return {"success": "Mise à jour validée"}
        
        if request.method == 'DELETE':

            db.session.delete(user)
            db.session.commit()
            return {"success": "Suppression terminée"}

Vous pouvez tester d'envoyer des requêtes avec le logiciel Postman. Lancez une requête 'GET' sur http://127.0.0.1:5000/user/1. Testez une requête PUT sur http://127.0.0.1:5000/user/1 avec comme contenu :

.. code-block:: json

    {
    "nom": "Dumont",
    "prenom": "Nestor",
    "email": "n.dumond@nouveaumail.com",
    "actif" : true
    }

Vous devriez recevoir en retour le message de succès. Relancez une requête 'GET' sur http://127.0.0.1:5000/user/1. Les infos de l'utilisateur ont changé.

Lancez une requête 'DELETE' http://127.0.0.1:5000/user/1. Relancez une requête 'GET' sur http://127.0.0.1:5000/user/1. Vous n'avez plus rien, l'utilisateur a été supprimé.

Organisation des fichiers
-------------------------

Vous pouvez très bien tout écrire dans le fichier ``app.py``, mais pour avoir un projet plus clair et organisé, je vous conseille de créer des dossiers ``models``, ``schemas`` et ``routes``. 

Votre arborescence de fichiers pourrait ressembler à ça :

.. code-block:: bash

    app.py
    config.py
    wsgi.py
    models
    |_ users.py
    routes
    |_ users.py
    schemas   
    |_ users.py
    venv #même s'il doit être dans le gitignore

Il faudra simplement faire attention à faire les appels nécessaires d'un fichier vers l'autre, et de déclarer les routes dans ``app.py`` en tant que blueprints (en appelant l'extension flasque eponyme) :

app.py :

.. code-block:: python

    from flask import Flask, jsonify, request
    from flask_sqlalchemy import SQLAlchemy
    from flask_marshmallow import Marshmallow
    from flask_migrate import Migrate

    from config import Config

    app = Flask(__name__)
    app.config.from_object(Config)

    db = SQLAlchemy(app) # Lie notre app à SQLAlchemy
    ma = Marshmallow(app)
    migrate = Migrate(app, db)

    from routes import users
    app.register_blueprint(users.bp)

models/users.py :

.. code-block:: python

    from app import db

    # Table de liaison n à n des utilisateurs avec les expertises
    cor_users_expertises = db.Table('cor_users_expertises',
        db.Column('user_id', db.Integer, db.ForeignKey('users.id_user')),
        db.Column('expertise_id', db.Integer, db.ForeignKey('expertises.id_expertise'))
    )

    class Users(db.Model):
        id_user = db.Column(db.Integer, primary_key=True)
        nom = db.Column(db.String(255)) 
        prenom = db.Column(db.String(255)) 
        email = db.Column(db.String(255)) 
        actif = db.Column(db.Boolean)
        expertises = db.relationship(
            'Expertises',
            secondary=cor_users_expertises
        )

    class Expertises(db.Model):
        id_expertise = db.Column(db.Integer, primary_key=True)
        nom_expertise = db.Column(db.String(255))   

shemas/users.py :

.. code-block:: python

    from models.users import Users, Expertises
    from app import ma

    class UsersSchema(ma.SQLAlchemyAutoSchema) :
        class Meta :
            model = Users
        expertises = ma.Nested(lambda :ExpertiseSchema, many = True)
        
    class ExpertiseSchema(ma.SQLAlchemyAutoSchema) :
        class Meta :
            model = Expertises

routes/users.py :

.. code-block:: python

    from flask import Blueprint, jsonify, request

    from schemas.users import UsersSchema
    from models.users import Users
    from app import app, db

    bp = Blueprint('users', __name__)

    #route pour récupérer les informations d'un utilisateur
    @bp.route('/user/<id_user>', methods=['GET','PUT','DELETE'])
    def User(id_user):

        user = Users.query.filter_by(id_user=id_user).first()

        if request.method == 'GET':
        
            schema = UsersSchema(many=False)
            userObj = schema.dump(user)

            return jsonify(userObj)

        if request.method == 'PUT':
            
            data = request.get_json()

            user.nom = data['nom']
            user.prenom = data['prenom']
            user.email = data['email']
            user.actif = data['actif']

            db.session.commit()
            return {"success": "Mise à jour validée"}
        
        if request.method == 'DELETE':

            db.session.delete(user)
            db.session.commit()
            return {"success": "Suppression terminée"}

    #route pour récupérer les informations de l'ensemble des utilisateurs
    @app.route('/users', methods=['GET'])
    def getUsers():
        users = Users.query.filter_by(actif=True).all()
        schema = UsersSchema(many=True)
        usersObj = schema.dump(users)

        return jsonify(usersObj)