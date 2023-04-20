# tutos_atelier_si
Documentation liée aux présentations de l'atelier SI en réseau de RNF

# Installation (Linux)
En cas d'utilisation d'un environnement Windows, voir la doc Windows Sub-System Linux

- Clonage du projet
    ``` bash
    cd /mon/dossier/cible
    git clone https://github.com/RNF-SI/tutos_atelier_si.git
    cd ./tutos_atelier_si
    git checkout manouvellebranche
    ```

-  Installation d'un environnement virtuel
    - Installation des paquets nécessaire à la création d'un environnement virtuel.
        ``` bash
        sudo apt install build-essential python3 python3-pip python3-venv
        ```
    - Création d'un environnement virtuel nommé `venv`.
        ``` bash
        cd /mon/dossier/cible/tutos_atelier_si
        python3 -m venv venv
        ```
    - Activation de l'environnement virtuel et installation des paquets nécessaire à l'exécution du projet `tutos_atelier_si`.
        ``` bash
        cd /mon/dossier/cible/tutos_atelier_si
        source venv/bin/activate
        pip install -r requirements.txt
        ```
- Exécution du projet en local
    ``` bash
    cd /mon/dossier/cible/tutos_atelier_si
    make livehtml
    ```