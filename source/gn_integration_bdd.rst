Intégrer des données dans Occtax et Monitoring (Atelier du 30 avril 2025)
===================================================================

..  youtube:: RcVYcPHNZ_0 
    
| source `Structure de la base de données de GeoNature (github PnX-SI) <https://docs.geonature.fr/admin-manual.html#base-de-donnees>`_ (Documentation officielle)

----------
Préambule
----------

GeoNature bénéficie d'un module d'import. Cependant, à ce jour, il n'est pas possible d'intégrer des données directement dans OccTax : celles-ci sont intégrées à la synthèse et ne sont donc pas modifiables.

Il est cependant possible d'intégrer ces données dans OccTax via des manipulations successives en base de données. Le même raisonnement peut s'appliquer au module Monitoring.


-----------------------------------
Structure d'OccTax et de Monitoring
-----------------------------------

La structure basique d'OccTax est la suivante : 1 observation dans Geonature est constituée de :

    * 1 relevé : pr_occtax.t_releves_occtax (nommé rel dans les scripts suivants) 
    * regroupant t observateurs [pr_occtax.cor_role_releve (obs)] et n occurrences [pr_occtax.t_occurrences_occtax (occ)] 
    * chaque occurrence regroupe k dénombrements : pr_occtax.cor_counting_occtax (dnb).

La structure de Monitoring est un peu plus complexe :

    * 1 groupe de site : gn_monitoring.t_site_groups (nommé tsg dans les scripts suivants) 
    * contenant s sites : gn_monitoring.t_base_sites (tbs) et gn_monitoring.t_sites_complements (tsc)
    * regroupant t observateurs [gn_monitoring.cor_role_visit (crv)] liés p passages [gn_monitoring.t_base_visits (tbs) et gn_monitoring.t_visit_complements (tvc)] 
    * chaque passage regroupe n occurrences : gn_monitoring.t_observations (to) et gn_monitoring.t_observation_complements (toc)
    * chaque occurrence comprend k détails : gn_monitoring.t_observations_details (tod)

Les couches compléments comprennent des informations complémentaires et notamment un champ additionnel data en jsonb permettant de personnaliser les éléments de saisie de chaque sous-module de suivi.

Pour la suite du tutoriel, nous ne descendrons pas au niveau détail des observations.

-------------------------------------------------
Préambule à l'intégration des données dans OccTax
-------------------------------------------------

Les éléments minimum pour pouvoir intégrer des données dans OccTax sont les suivants :

    * Un ``id_dataset`` en lien avec la table des jeux de données ``gn_meta.t_datasets``
    * Un identifiant d'observateur pour remplir le champ ``id_role`` de ``pr_occtax.cor_role_releve``
    * Un identifiant de numérisateur pour remplir le champ ``id_digitiser`` de ``pr_occtax.t_releves_occtax``
    * Une date de début d'observation pour remplir le champ ``date_min`` de ``pr_occtax.t_releves_occtax``
    * Une date de fin d'observation pour le champ ``date_max`` (on peut reprendre date_min si on n'en a pas)
    * Une géométrie pour remplir la colonne ``geom_4326`` de ``pr_occtax.t_releves_occtax``
    * Un identifiant d'espèce pour remplir le champ ``cd_nom`` de ``pr_occtax.t_occurrences_occtax`` et si on n'en a pas le champ ``nom_cite`` de la même table via un lien avec la table ``taxonomie.taxref``
    * Un effectif ou une plage d'effectif pour remplir les champs ``count_min`` / ``count_max`` de ``pr_occtax.cor_counting_occtax``

Le déroulé proposé pour l'intégration est la suivante :

    * Formatage des données d'import via un script python ou un  projet Qgis + complétude des tables utilisateurs.t_roles et gn_meta.t_datasets*
    * Copie des données dans une table de gn_import ou d'un schéma spécialement créé pour l'import de données
    * Création des relevés et mise à jour de la table d'import avec ``id_releve_occtax``
    * Création des observateurs
    * Création des occurrences et mise à jour de la table d'import avec les ``id_occurrence_occtax``
    * Création des dénombrements et mise à jour de la table d'import avec les ``id_counting_occtax``
    * Mise à jour d'un champ de la table d'import pour identifier les données intégrées à Occtax

La complétude des tables d'observateurs et des jeux de données n'est pas abordée dans le détail dans la suite du tutoriel.

Deux étapes sont potentiellement chronophages et peuvent impacter l'accès à GeoNature pendant l'intégration des données :

    * L'intégration de données dans la table des relevés si aucune altitude n'est indiquée (le calcul via le trigger est long)
    * L'intégration des données dans la table des dénombrements qui déclenche la mise à jour de de la synthèse.

-----------------------------
Création de la table d'import
-----------------------------

La structure de la table d'import créée au CEN Normandie pour les imports de données est définie ci-après. 
! bien regarder les contraintes et les valeurs par défaut pour les adapter à l'usage au sein de la structure. Par exemple, ci-dessous, les contraintes bloquent la suppression des jeux de données et du numérisateur pour lesquels la table d'import comporte des données.


.. code-block:: sql

    -- Table: _qgis.import_data
    -- DROP TABLE IF EXISTS _qgis.import_data;
    CREATE TABLE IF NOT EXISTS _qgis.import_data
    (
        fid SERIAL PRIMARY KEY,
        id_import integer, 
        source_import text  ,
        import_valid boolean DEFAULT false,
        date_import date, -- à ne remplir qu'à la fin de l'intégration de données => pour différencier les données importées / non importées
        id_dataset integer NOT NULL,
        id_digitiser integer NOT NULL,
        observers_txt text ,
        date_min timestamp without time zone NOT NULL,
        date_max timestamp without time zone,
        place_name text COLLATE pg_catalog."default",
        cd_hab integer,
        altitude_min integer,
        altitude_max integer,
        id_nomenclature_tech_collect_campanule integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('TECHNIQUE_OBS'::character varying),
        id_nomenclature_grp_typ integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('TYP_GRP'::character varying),
        grp_method text,
        id_nomenclature_geo_object_nature integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('NAT_OBJ_GEO'::character varying),
        cd_nom integer NOT NULL,
        nom_cite text,
        observers integer[],
        determiner text,
        id_nomenclature_obs_technique integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('METH_OBS'::character varying),
        id_nomenclature_determination_method integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('METH_DETERMIN'::character varying),
        id_nomenclature_bio_condition integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('ETA_BIO'::character varying), 
        id_nomenclature_bio_status integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('STATUT_BIO'::character varying),
        id_nomenclature_behaviour integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('OCC_COMPORTEMENT'::character varying),
        id_nomenclature_naturalness integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('NATURALITE'::character varying),
        id_nomenclature_observation_status integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('STATUT_OBS'::character varying),
        id_nomenclature_source_status integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('STATUT_SOURCE'::character varying),
        id_nomenclature_exist_proof integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('PREUVE_EXIST'::character varying),
        non_digital_proof text ,
        presence boolean DEFAULT false,
        count_min integer NOT NULL,
        count_max integer NOT NULL,
        id_nomenclature_life_stage integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('STADE_VIE'::character varying),
        id_nomenclature_sex integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('SEXE'::character varying),
        id_nomenclature_obj_count integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('OBJ_DENBR'::character varying),
        id_nomenclature_type_count integer NOT NULL DEFAULT pr_occtax.get_default_nomenclature_value('TYP_DENBR'::character varying),
        comment text,
        meta_device_entry character varying(50), -- Pour tracer les imports venus de Qgis
        meta_v_taxref integer,
        id_module integer , -- Mettre le numéro du module Occtax par défaut
        id_releve_occtax integer,
        id_occurrence_occtax integer,
        date_maj date,
        comment_releve text COLLATE pg_catalog."default",
        geom_local geometry(Geometry,2154),
        CONSTRAINT fk_import_behaviour FOREIGN KEY (id_nomenclature_behaviour)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_import_bio_condition FOREIGN KEY (id_nomenclature_bio_condition)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_import_bio_status FOREIGN KEY (id_nomenclature_bio_status)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_import_cd_hab FOREIGN KEY (cd_hab)
            REFERENCES ref_habitats.habref (cd_hab) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET NULL,
        CONSTRAINT fk_import_cd_nom FOREIGN KEY (cd_nom)
            REFERENCES taxonomie.taxref (cd_nom) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE CASCADE,
        CONSTRAINT fk_import_determination_method FOREIGN KEY (id_nomenclature_determination_method)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_import_exist_proof FOREIGN KEY (id_nomenclature_exist_proof)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_import_id_nomenclature_geo_object_nature FOREIGN KEY (id_nomenclature_geo_object_nature)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_import_life_stage FOREIGN KEY (id_nomenclature_life_stage)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_import_naturalness FOREIGN KEY (id_nomenclature_naturalness)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_import_obj_count FOREIGN KEY (id_nomenclature_obj_count)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_import_obs_meth FOREIGN KEY (id_nomenclature_obs_technique)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_import_obs_technique_campanule FOREIGN KEY (id_nomenclature_tech_collect_campanule)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_import_observation_status FOREIGN KEY (id_nomenclature_observation_status)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_import_regroupement_typ FOREIGN KEY (id_nomenclature_grp_typ)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_import_sexe FOREIGN KEY (id_nomenclature_sex)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_import_source_status FOREIGN KEY (id_nomenclature_source_status)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_import_t_datasets FOREIGN KEY (id_dataset)
            REFERENCES gn_meta.t_datasets (id_dataset) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE NO ACTION,
        CONSTRAINT fk_import_t_roles FOREIGN KEY (id_digitiser)
            REFERENCES utilisateurs.t_roles (id_role) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE NO ACTION,
        CONSTRAINT fk_import_typ_count FOREIGN KEY (id_nomenclature_type_count)
            REFERENCES ref_nomenclatures.t_nomenclatures (id_nomenclature) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT,
        CONSTRAINT fk_qgis_id_occurrence_occtax FOREIGN KEY (id_occurrence_occtax)
            REFERENCES pr_occtax.t_occurrences_occtax (id_occurrence_occtax) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET NULL,
        CONSTRAINT fk_qgis_id_releve_occtax FOREIGN KEY (id_releve_occtax)
            REFERENCES pr_occtax.t_releves_occtax (id_releve_occtax) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE SET NULL,
        CONSTRAINT check_import_altitude_max CHECK (altitude_max >= altitude_min),
        CONSTRAINT check_import_behaviour CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_behaviour, 'OCC_COMPORTEMENT'::character varying)),
        CONSTRAINT check_import_bio_condition CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_bio_condition, 'ETA_BIO'::character varying)),
        CONSTRAINT check_import_bio_status CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_bio_status, 'STATUT_BIO'::character varying)),
        CONSTRAINT check_import_count_max CHECK (count_max >= count_min AND count_max >= 0),
        CONSTRAINT check_import_count_min CHECK (count_min >= 0),
        CONSTRAINT check_import_date_max CHECK (date_max >= date_min),
        CONSTRAINT check_import_determination_method CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_determination_method, 'METH_DETERMIN'::character varying)),
        CONSTRAINT check_import_exist_proof CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_exist_proof, 'PREUVE_EXIST'::character varying)),
        CONSTRAINT check_import_geo_object_nature CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_geo_object_nature, 'NAT_OBJ_GEO'::character varying)),
        CONSTRAINT check_import_life_stage CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_life_stage, 'STADE_VIE'::character varying)),
        CONSTRAINT check_import_naturalness CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_naturalness, 'NATURALITE'::character varying)),
        CONSTRAINT check_import_obj_count CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_obj_count, 'OBJ_DENBR'::character varying)),
        CONSTRAINT check_import_obs_meth CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_obs_technique, 'METH_OBS'::character varying)),
        CONSTRAINT check_import_obs_status CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_observation_status, 'STATUT_OBS'::character varying)),
        CONSTRAINT check_import_obs_technique CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_tech_collect_campanule, 'TECHNIQUE_OBS'::character varying)),
        CONSTRAINT check_import_regroupement_typ CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_grp_typ, 'TYP_GRP'::character varying)),
        CONSTRAINT check_import_sexe CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_sex, 'SEXE'::character varying)),
        CONSTRAINT check_import_source_status CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_source_status, 'STATUT_SOURCE'::character varying)),
        CONSTRAINT check_import_type_count CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_type_count, 'TYP_DENBR'::character varying))
    )
    ;
    COMMENT ON TABLE _qgis.import_data
        IS 'Table pour importer les données dans le module OccTax'
    ;
    COMMENT ON COLUMN _qgis.import_data.import_valid
        IS 'Case à cocher pour les données prêtes à être intégrées à GeoNature'
    ;
    COMMENT ON COLUMN _qgis.import_data.comment
        IS 'Commentaires éventuels'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_dataset
        IS 'OBLIGATOIRE - Lien vers le jeu de données à intégrer au relevé'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_digitiser
        IS 'OBLIGATOIRE - Numérisateur du relevé'
    ;
    COMMENT ON COLUMN _qgis.import_data.date_min
        IS 'OBLIGATOIRE - Date de début du relevé - mettre le début de la campagne de terrain pour un relevé sans date précise'
    ;
    COMMENT ON COLUMN _qgis.import_data.date_max
        IS 'Date de fin du relevé - à remplir pour une campagne de terrain pour un relevé sans date précise'
    ;
    COMMENT ON COLUMN _qgis.import_data.place_name
        IS 'Indication toponymique éventuelles (lieu-dit...)'
    ;
    COMMENT ON COLUMN _qgis.import_data.cd_hab
        IS 'Indication éventuelle sur les habitats du relevés (EUNIS niveau 2)'
    ;
    COMMENT ON COLUMN _qgis.import_data.altitude_min
        IS 'Altitude minimale du relevé'
    ;
    COMMENT ON COLUMN _qgis.import_data.altitude_max
        IS 'Altitude maximale du relevé'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_tech_collect_campanule
        IS 'OBLIGATOIRE - Technique de collecte du relevé (CAMPANULE)'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_grp_typ
        IS 'OBLIGATOIRE - Type de relevé (observation, relevé phyto...)'
    ;
    COMMENT ON COLUMN _qgis.import_data.grp_method
        IS 'Précision éventuelle sur le regroupement'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_geo_object_nature
        IS 'OBLIGATOIRE - Nature géographique du relevé - se remplit automatiquement'
    ;
    COMMENT ON COLUMN _qgis.import_data.cd_nom
        IS 'OBLIGATOIRE - Identifiant unique du taxon dans Taxref'
    ;
    COMMENT ON COLUMN _qgis.import_data.nom_cite
        IS 'Nom du taxon importé (par exemple nom issu de DIGITALE du CBNB) - le nom valide de taxref sera utilisé si la ligne est laissée vide'
    ;
    COMMENT ON COLUMN _qgis.import_data.observers
        IS 'OBLIGATOIRE - Observateurs'
    ;
    COMMENT ON COLUMN _qgis.import_data.determiner
        IS 'Nom du déterminateur si différent du ou des observateurs'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_obs_technique
        IS 'OBLIGATOIRE - Technique d''observation'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_determination_method
        IS 'OBLIGATOIRE - Méthode de détermination du taxon'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_bio_condition
        IS 'OBLIGATOIRE - Condition biologique du ou des élément.s observé.s'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_bio_status
        IS 'OBLIGATOIRE - Statut biologique du ou des élément.s observé.s'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_behaviour
        IS 'OBLIGATOIRE - Comportement du ou des élément.s observé.s'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_naturalness
        IS 'OBLIGATOIRE - Naturalité du ou des élément.s observé.s'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_observation_status
        IS 'OBLIGATOIRE - Statut de l''observation'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_source_status
        IS 'OBLIGATOIRE - Source de l''observation (par défaut terrain)'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_exist_proof
        IS 'OBLIGATOIRE - Existence d''une preuve (échantillon, photo...)'
    ;
    COMMENT ON COLUMN _qgis.import_data.non_digital_proof
        IS 'OBLIGATOIRE - Numéro ou identifiant de la preuve d''existence'
    ;
    COMMENT ON COLUMN _qgis.import_data.presence
        IS 'A cocher si pas de dénombrement - laisser les effectifs à 1 dans ce cas'
    ;
    COMMENT ON COLUMN _qgis.import_data.count_min
        IS 'OBLIGATOIRE - Effectif minimal'
    ;
    COMMENT ON COLUMN _qgis.import_data.count_max
        IS 'Effectif maximal'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_life_stage
        IS 'OBLIGATOIRE - Stade de vie'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_sex
        IS 'OBLIGATOIRE - Sexe'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_obj_count
        IS 'OBLIGATOIRE - Objet du dénombrement (individu, surface...)'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_nomenclature_type_count
        IS 'OBLIGATOIRE - Type de dénombrement (compté, estimé...)'
    ;
    COMMENT ON COLUMN _qgis.import_data.id_import
        IS 'Identifiant unique dans la table d''origine'
    ;
    COMMENT ON COLUMN _qgis.import_data.source_import
        IS 'OBLIGATOIRE - Chemin vers la table d''origine'
    ;

    -- Index: sidx_import_data
    -- DROP INDEX IF EXISTS _qgis.sidx_import_data;
    CREATE INDEX IF NOT EXISTS sidx_import_data
        ON _qgis.import_data USING gist
        (geom_local)
        TABLESPACE pg_default
    ;


Dans l'exemple vidéo, une table de lien entre les jeux de données et les sites de ``ref_geo.l_areas`` est utilisée pour récupérer la géométrie d'une liste d'espèces sur un site présent dans ref_geo.l_areas


.. code-block:: sql

    -- Table: gn_meta.cor_dataset_site
    -- DROP TABLE IF EXISTS gn_meta.cor_dataset_site;

    CREATE TABLE IF NOT EXISTS gn_meta.cor_dataset_site
    (
        id_cor_dataset_site SERIAL PRIMARY KEY,
        id_area integer NOT NULL,
        id_dataset integer NOT NULL,
        verif boolean DEFAULT false,
        additional_data jsonb,
        CONSTRAINT cor_dataset_site_id_dataset_fkey FOREIGN KEY (id_dataset)
            REFERENCES gn_meta.t_datasets (id_dataset) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE CASCADE,
        CONSTRAINT cor_dataset_site_id_type_id_site_fkey FOREIGN KEY (id_area)
            REFERENCES ref_geo.l_areas (id_area) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE CASCADE
    )
    ;


La vue suivante permet d'utiliser le projet Qgis fournit :


.. code-block:: sql

    -- View: ref_nomenclatures.v_0_nomen_active

    -- DROP VIEW ref_nomenclatures.v_0_nomen_active;

    CREATE OR REPLACE VIEW ref_nomenclatures.v_0_nomen_active
    AS
    WITH nomen_tx AS (
            SELECT cor_taxref_nomenclature.id_nomenclature,
                string_agg(DISTINCT cor_taxref_nomenclature.regne::text, ', '::text) AS regne,
                string_agg(DISTINCT cor_taxref_nomenclature.group2_inpn::text, ', '::text) AS group2_inpn,
                string_agg(DISTINCT cor_taxref_nomenclature.group3_inpn::text, ', '::text) AS group3_inpn
            FROM ref_nomenclatures.cor_taxref_nomenclature
            GROUP BY cor_taxref_nomenclature.id_nomenclature
            )
    SELECT 
        n.id_nomenclature,
        n.cd_nomenclature,
        n.mnemonique ,
        n.label_default ,
        n.definition_default ,
        bnt.id_type,
        bnt.mnemonique AS mnemo_type,
        bnt.source AS source_type,
        nt.regne,
        nt.group2_inpn,
        nt.group3_inpn
    FROM ref_nomenclatures.t_nomenclatures n
        LEFT JOIN ref_nomenclatures.bib_nomenclatures_types bnt USING (id_type)
        LEFT JOIN nomen_tx nt USING (id_nomenclature)
    WHERE n.active = true
    ORDER BY bnt.mnemonique, n.mnemonique
    ;
    COMMENT ON VIEW ref_nomenclatures.v_0_nomen_active
        IS 'Nomenclatures actives de la BDD GeoNature du CENNormandie'
    ;
    COMMENT ON COLUMN ref_nomenclatures.v_0_nomen_active.id_nomenclature
        IS 'Identifiant de la BDD GeoNature de la nomenclature (id_mnemonique de t_nomenclatures)'
    ;
    COMMENT ON COLUMN ref_nomenclatures.v_0_nomen_active.cd_nomenclature
        IS 'Identifiant de la BDD de référence de la nomenclature (cd_nomenclature de t_nomenclatures)'
    ;
    COMMENT ON COLUMN ref_nomenclatures.v_0_nomen_active.id_type
        IS 'Identifiant du type de nomenclature (id_type de bib_nomenclatures_types et t_nomenclatures)'
    ;
    COMMENT ON COLUMN ref_nomenclatures.v_0_nomen_active.mnemo_type
        IS 'Mnémonique du type de nomenclature (mnemonique de bib_nomenclatures_types)'
    ;
    COMMENT ON COLUMN ref_nomenclatures.v_0_nomen_active.mnemonique
        IS 'Mnémonique de la nomenclature (mnemonique de t_nomenclatures)'
    ;
    COMMENT ON COLUMN ref_nomenclatures.v_0_nomen_active.label_default
        IS 'Label de la nomenclature (label_fr de t_nomenclatures)'
    ;
    COMMENT ON COLUMN ref_nomenclatures.v_0_nomen_active.definition_default
        IS 'Définition de la nomenclature (definition_fr de t_nomenclatures)'
    ;

La dernière étape consiste à modifier dans le projet qgis les valeurs de connexion à la base de données. Pour cela, il suffit d'ouvrir le fichier qgs avec un éditeur de texte et de changer avec un rechercher/remplacer:

    * ``dbname='geonature'`` => à remplacer par le nom de votre base de données 
    * ``host=127.0.0.1`` => à remplacer par l'adresse IP de la BDD
    * ``port=5432`` => a priori OK
    * ``sslmode=allow`` => a priori OK
    * ``authcfg=aaaa000`` => utiliser la clé d'authentification de votre base de données. Il faut avoir préalablement créé un connexion à la bdd et enregistrer le nom d'utilisateur et le mot de passe

Par exemple :

.. code-block:: txt

    <layer-tree-layer providerKey="postgres" id="t_releves_occtax_1155bfde_cbb7_4910_82c5_3d0457100f82" source="dbname='geonature' host=127.0.0.1 port=5432 sslmode=allow authcfg=aaaa000 key='fid' estimatedmetadata=true srid=2154 type=Point checkPrimaryKeyUnicity='1' table=&quot;_qgis&quot;.&quot;import_data&quot; (geom_local) sql=&quot;id_occurrence_occtax&quot; IS NULL" expanded="0" legend_split_behavior="0" name="Observations (releve - occurrence - dénombrement)" patch_size="-1,-1" checked="Qt::Checked" legend_exp="">




--------------
Import de données avec géométries
--------------

Une fois les données intégrées dans la table _qgis.import_data, formatées et vérifiées, mettre à jour la valeur de la colonne ``import_valid`` en true.

L'import se base sur deux contraintes pour l'ensemble des scripts ci-après : ``WHERE import_valid is TRUE and date_import is NULL``.


¤ Intégration des relevés

Le script suivant permet de réunir les données qui ont des valeurs identiques sur l'ensemble des données à importer dans la table ``pr_occtax.t_releves_occtax``. Pour rappel, les informations minimales à remplir dans la table d'import pour pouvoir créer un relevé sont les suivantes:

    * Une date d'observation => ``date_min``,
    * Un numérisateur => ``id_digitiser``,
    * Une géométrie => ``geom_4326``,
    * Un observateur (qui peut être le même que le numérisateur, voir ci-après).

Le calcul de l'altitude via le trigger intégré à GeoNature est chronophage quand les données à importer sont nombreuses : il vaut mieux remplir les deux champs d'altitude avant de lancer l'insertion des données dans la table des relevés.


.. code-block:: sql

    /*
    --------------------------
    REMPLISSAGE DES ALTITUDES
    --------------------------
    */
    -- Correction des géométries invalides
    UPDATE _qgis.import_data
        SET geom_local = ST_MakeValid(geom_local)
    WHERE ST_IsValid(geom_local) IS false
    ;
    -- Récupération de l'altitude minimale si elle existe pour remplir l'altitude maximale (cas des points)
    UPDATE _qgis.import_data imp_data
        SET 
            altitude_max = altitude_min
    WHERE import_valid is TRUE
        and date_import is NULL
        and altitude_max is NULL
        and not altitude_min is NULL
        and ST_GeometryType(geom_local) = 'ST_Point'
    ;
    -- Calcul des altitudes pour les autres cas
    WITH alti_data as (
        SELECT 
            fid,
            (to_jsonb(ref_geo.fct_get_altitude_intersection(imp.geom_local))->> 'altitude_min')::integer as alti_min
        FROM _qgis.import_data imp
        WHERE imp.altitude_min is null and import_valid is true
    )
    UPDATE _qgis.import_data imp_data
        SET 
            altitude_min =  alti_data.alti_min
    FROM alti_data
    WHERE 
        imp_data.altitude_min is null 
        and imp_data.fid = alti_data.fid 
        and import_valid is true
        and date_import is null
    ;
    WITH alti_data as (
        SELECT 
            fid,
            (to_jsonb(ref_geo.fct_get_altitude_intersection(imp.geom_local))->> 'altitude_max')::integer as alti_max
        FROM _qgis.import_data imp
        WHERE imp.altitude_max is null and import_valid is true
    )
    UPDATE _qgis.import_data imp_data
        SET 
            altitude_max = alti_data.alti_max
    FROM alti_data
    WHERE 
        imp_data.altitude_max is null 
        and imp_data.fid = alti_data.fid 
        and import_valid is true
        and date_import is null
    ;


Si besoin, on peut remplir la case observateur avec le numérisateur :


.. code-block:: sql

    -- Modification des observateurs avec le numérisateur
    UPDATE _qgis.import_data i SET observers = ARRAY[ i.id_digitiser ]
    WHERE i.date_import IS NULL and i.observers IS NULL and import_valid is true
    ;


Une fois ces étapes réalisées, les relevés sont créés par un group by. Les identifiants uniques sont renseignés dans le champs jsonb ``additional_fields`` afin de faire le lien par la suite avec la table d'import.


.. code-block:: sql

    -- Intégration des relevés à la table de pr_occtax.t_releves_occtax
    WITH ids_observers as (
        SELECT 
            fid,
            UNNEST(observers)::integer  as id_observer
        FROM _qgis.import_data imp
    ),
    observ as (
        SELECT
            o.fid,
            STRING_AGG(DISTINCT (r.nom_role || ' ' || r.prenom_role), ', ') as observers_txt
        FROM ids_observers o
        LEFT JOIN utilisateurs.t_roles r ON o.id_observer = r.id_role
        GROUP BY o.fid
    ),
    import_data as (
    SELECT 
        d.id_dataset, 
        d.id_digitiser, 
        COALESCE(d.observers_txt, observ.observers_txt) as observers_txt, 
        d.id_nomenclature_tech_collect_campanule, 
        d.id_nomenclature_grp_typ, 
        d.grp_method, 
        d.date_min::date as date_min, 
        COALESCE( d.date_max , d.date_min)::date as date_max, 
        (
            CASE
            WHEN d.date_min::time='00:00:00' THEN NULL 
            ELSE d.date_min::time END 
        ) as hour_min, 
        (
            CASE
            WHEN COALESCE( d.date_max ::time, d.date_min::time)='00:00:00' THEN NULL 
            ELSE COALESCE( d.date_max ::time, d.date_min::time) END
        ) as hour_max, 
        d.cd_hab, 
        d.altitude_min, 
        d.altitude_max, 
        d.place_name, 
        d.meta_device_entry, 
        d.geom_local, 
        -- Le relevé se fit à la colonne geom_4326 pour générer la géométrie 
        -- => pas de géométrie si geom_4326 est nulle même si geom_local ne l'est pas
        ST_Transform(d.geom_local, 4326) as geom_4326, 
        d.id_nomenclature_geo_object_nature,
        jsonb_build_object(	
            'fids_import',
            -- to_jsonb(
                array_agg(d.fid) 
            --)
        )  as additional_fields,
        d.id_module
    FROM _qgis.import_data d
    LEFT JOIN observ USING (fid)
    WHERE d.date_import is null and d.id_releve_occtax is null  and import_valid is true
    GROUP BY 
        d.id_dataset, 
        d.id_digitiser, 
        observ.observers_txt, 
        d.observers_txt,
        d.id_nomenclature_tech_collect_campanule, 
        d.id_nomenclature_grp_typ, 
        d.grp_method, 
        d.date_min, 
        d.date_max, 
        hour_min,
        hour_max,
        d.cd_hab, 
        d.altitude_min, 
        d.altitude_max, 
        d.place_name, 
        d.meta_device_entry, 
        d.geom_local, 
        d.id_nomenclature_geo_object_nature, 
        d.id_module
    )
    INSERT INTO pr_occtax.t_releves_occtax (
        id_dataset, 
        id_digitiser, 
        observers_txt, 
        id_nomenclature_tech_collect_campanule, 
        id_nomenclature_grp_typ, 
        grp_method, 
        date_min, 
        date_max , 
        hour_min,
        hour_max,
        cd_hab, 
        altitude_min, 
        altitude_max, 
        place_name, 
        meta_device_entry, 
        geom_local, 
        geom_4326,
        id_nomenclature_geo_object_nature,
        additional_fields,
        id_module
    )
    SELECT 
        *
    FROM import_data
    ORDER BY date_min
    ;   


Les ``id_releves_occtax`` sont ensuite récupérés et intégrés à la table d'import :


.. code-block:: sql

    -- Ajout des id_releves à la table d'import
    WITH rel as (
        SELECT
            id_releve_occtax,
            (jsonb_array_elements_text(additional_fields -> 'fids_import'))::integer  as fid
        FROM pr_occtax.t_releves_occtax rel
        WHERE meta_device_entry = 'qgis' and not additional_fields -> 'fids_import' is null
    )
    UPDATE _qgis.import_data d
    SET id_releve_occtax = rel.id_releve_occtax
    FROM  rel 
    WHERE d.fid = rel.fid
    AND d.id_releve_occtax IS NULL
    ;

Et pour finir avec les relevés, les observateurs (a priori non obligatoire si le champs observers_txt est rempli) :


.. code-block:: sql

    -- Intégration des observateurs des relevés
    WITH rel_obs as (
        SELECT
            id_releve_occtax,
            UNNEST(observers) as id_role -- Eclatement de la colonne observers pour générer 1 ligne par relevé et observateur
        FROM _qgis.import_data d
        WHERE date_import is NULL and import_valid is true and not id_releve_occtax is null
        GROUP BY id_releve_occtax, id_role
    )
    INSERT INTO pr_occtax.cor_role_releves_occtax(
        id_role,
        id_releve_occtax
    )
    SELECT 
        rel_obs.id_role,
        rel_obs.id_releve_occtax
    FROM rel_obs
    ON CONFLICT DO NOTHING
    ;


Une fois les relevés créés, il est possible d'intégrer des observations. Pour plus de facilité, le code suivant génère un dénombrement par occurrence mais il est possible de faire plusieurs dénombrements en générant un groupby sur l'intégration des occurrences comme à l'étape relevé.


.. code-block:: sql

    -- Insertion des observations à la table des occurrences
    INSERT INTO pr_occtax.t_occurrences_occtax(
        id_releve_occtax, 
        id_nomenclature_obs_technique, 
        id_nomenclature_bio_condition, 
        id_nomenclature_bio_status, 
        id_nomenclature_naturalness, 
        id_nomenclature_exist_proof, 
        --id_nomenclature_diffusion_level, 
        id_nomenclature_observation_status, 
        --id_nomenclature_blurring, 
        id_nomenclature_source_status, 
        id_nomenclature_behaviour, 
        determiner, 
        id_nomenclature_determination_method, 
        cd_nom,
        nom_cite, 
        meta_v_taxref,
        --sample_number_proof, 
        --digital_proof, 
        non_digital_proof, 
        comment, 
        additional_fields
    )
    SELECT 
        d.id_releve_occtax, 
        d.id_nomenclature_obs_technique, 
        d.id_nomenclature_bio_condition, 
        d.id_nomenclature_bio_status, 
        d.id_nomenclature_naturalness, 
        d.id_nomenclature_exist_proof, 
        --id_nomenclature_diffusion_level, 
        d.id_nomenclature_observation_status, 
        --id_nomenclature_blurring, 
        d.id_nomenclature_source_status, 
        d.id_nomenclature_behaviour, 
        d.determiner, 
        d.id_nomenclature_determination_method, 
        d.cd_nom,
        COALESCE(d.nom_cite, tx.nom_valide), 
        CASE WHEN d.meta_v_taxref IS NULL THEN 17 ELSE d.meta_v_taxref END, -- la valeur par défaut renvoie une erreur et bloque l'insertion => à modifier en fonction de votre GeoNature
        --sample_number_proof, 
        --digital_proof, 
        d.non_digital_proof, 
        d.comment, 
        jsonb_build_object(	
            'fid_import',
            d.fid
        ) as additional_fields
    FROM _qgis.import_data d
    LEFT JOIN taxonomie.taxref tx USING (cd_nom)
    WHERE d.date_import is null and import_valid is true
    ORDER BY id_releve_occtax, fid
    ;
    -- ajout des id_occurrence à la table d'import
    WITH obs as (
        SELECT
            id_releve_occtax,
            id_occurrence_occtax,
            (additional_fields -> 'fid_import')::integer  as fid
        FROM pr_occtax.t_occurrences_occtax o
        WHERE not additional_fields -> 'fid_import' is null
    )
    UPDATE _qgis.import_data d
    SET id_occurrence_occtax = obs.id_occurrence_occtax
    FROM  obs 
    WHERE obs.fid = d.fid
    AND d.id_occurrence_occtax is null 
    AND NOT d.id_releve_occtax is null
    ;


Pour finir, il ne reste plus qu'à intégrer les dénombrements. Cette étape va lancer la mise à jour de la synthèse, ce qui est potentiellement chronophage si un grand nombre de données est intégré en une fois.

Remarque : il est nécessaire de nettoyer les colonnes ``additional_fields`` de ``t_occurrences_occtax`` et ``t_releves_occtax`` avant cette étape si on ne souhaite pas que les identifiants d'import remontent dans la synthèse.


.. code-block:: sql

    -- Intégration des dénombrements
    INSERT INTO pr_occtax.cor_counting_occtax(
        id_occurrence_occtax, 
        id_nomenclature_life_stage, 
        id_nomenclature_sex, 
        id_nomenclature_obj_count, 
        id_nomenclature_type_count, 
        count_min,
        count_max, 
        additional_fields
    )
    SELECT 
        d.id_occurrence_occtax, 
        d.id_nomenclature_life_stage, 
        d.id_nomenclature_sex, 
        d.id_nomenclature_obj_count, 
        d.id_nomenclature_type_count, 
        d.count_min,
        d.count_max, 
        jsonb_build_object(	
            'presence',
            CASE WHEN d.presence = 'true' THEN 'présence' ELSE 'dénombrement' END
        ) as additional_fields
    FROM _qgis.import_data d
    WHERE d.date_import is null and import_valid is true and not d.id_occurrence_occtax is null
    ORDER BY id_occurrence_occtax
    ;
    -- Ajout de la date d'import dans la table source afin d'identifier les données déjà intégrées
    UPDATE _qgis.import_data d
    SET date_import = now()
    WHERE d.date_import is null and not id_occurrence_occtax IS NULL
    ;


--------------
Import de données sans géométries
--------------

Pour les observations convernant un inventaire sur l'ensemble d'un site, un tableau excel a été proposé aux chargés de mission. Les observations sont ensuite rattachées à la géométrie du site en question, celui-ci ayant été au préalable intégré à ref_geo.l_areas et rattaché à un jeu de données.

Un lien a également été fait avec le référentiel flore du CBN de Bailleul (DIGITALE), les chargés de mission connaissant mieux les taxons de celui-ci que ceux de Taxref.

Le tableau excel d'import comporte 6 onglets :

    * Un onglet metadata qui explique son fonctionnement,
    * Un onglet IMPORT dans lequel les données sont entrées par les chargés de mission et les champs obligatoires sont complétés via des RECHERCHEV()
    * Un onglet jdd reprenant l'ensemble des jeux de données des sites
    * Un onglet utilisateurs reprenant les observateurs actifs de GeoNature (extraits de t_roles en fonction de la liste des contributeurs)
    * Un onglet digitale-taxref faisant le lien entre les taxons DIGITALE et TAXREF qui peut être complété en fonction des manques
    * Un onglet nomenclatures pour reprendre une partie des éléments de contexte, notamment le type de regroupement du relevé (permettant d'exclure ensuite les données des statistiques si nécessaire)

La procédure est la même que ci-dessus mais en préalable, il faut récupérer la géométrie du site avec par exemple le code suivant :


.. code-block:: sql

    WITH s as (
        SELECT
            *
        FROM ref_geo.l_areas la
        INNER JOIN gn_meta.cor_dataset_site ds USING (area_code)
    )
    UPDATE  _qgis.import_data i
        SET i.geom_local = s.geom
    FROM s
        WHERE s.id_dataset = i.id_dataset
        AND i.geom_local IS NULL 
        AND import_valid IS TRUE 
        AND date_import is null


--------------
Procédure pour Monitoring
--------------

La procédure pour Monitoring repose sur le même principe. Les changements concernent la récupération des identifiants :

    * id_sites_group,
    * id_base_site, 
    * id_base_visit,
    * id_observation,
    * id_observation_detail. 

En effet, les champs data n'étant pas dans la table créant les identifiants uniques, on ne peut pas intégrer les id_import directement dans celle-ci. Il est possible de mettre l'id_import dans le champ commentaire ou description de chaque table pour intégrer les identifiants uniques dans la table d'import avant de créer les éléments dans les tables de compléments et d'intégrer l'id_import dans le champs data si nécessaire. Il faut ensuite faire un UPDATE pour nettoyer le champ commentaire.

Voici un exemple de code d'intégration dans monitoring concernant le protocole STERF pour les versions de GeoNature jusqu'à la 2.14, les version 2.15 et suivantes nécessitant des ajustements suite à la création de nouvelles tables :

Remarque : cette intégration s'arrête au niveau ``t_observations`` et ne va pas jusqu'au niveau ``t_observation_details``.

.. code-block:: sql

    -- Création de la table d'import
    CREATE TABLE _qgis.test_sterf (
        fid SERIAL PRIMARY KEY, 
        transect TEXT, 
        annee INTEGER, 
        num_passage INTEGER, 
        visit_date_min timestamp without time zone , 
        tp VARCHAR(50), 
        cn VARCHAR(50), 
        vt VARCHAR(50), 
        hab_1 TEXT, 
        hab_2 TEXT, 
        visit_comment TEXT, 
        determiner TEXT, 
        cd_nom INTEGER, 
        nom_complet TEXT, 
        effectif INTEGER, 
        obs_comment TEXT,
        id_sites_group INTEGER,
        id_base_site INTEGER,
        id_base_visit INTEGER,
        id_observation INTEGER,
        geom_local GEOMETRY(LINESTRING,2154)
    );
    -- SCRIPT D'INTEGRATION AU MODULE
    -- Groupe de site
    WITH sterf_module as (
        SELECT
            id_module,
            module_code
        FROM gn_commons.t_modules
        WHERE module_code = 'sterf'
    )
    INSERT INTO gn_monitoring.t_sites_groups(
        sites_group_name,
        id_module
    )
    SELECT
        SPLIT_PART(transect, '_', 1) as sites_group_name, -- à modifier en fonction du formatage de vos données
        id_module
    FROM _qgis.test_sterf
    LEFT JOIN sterf_module on module_code = 'sterf'
    GROUP BY SPLIT_PART(transect, '_', 1) , id_module -- à modifier en fonction du formatage de vos données
    ;
    UPDATE _qgis.test_sterf i
    SET id_sites_group = tsg.id_sites_group
    FROM gn_monitoring.t_sites_groups tsg
    WHERE lower(sites_group_code) LIKE '%' || lower(SPLIT_PART(transect, '_', 1)) || '%' -- à modifier en fonction du formatage de vos données
    ;
    -- transect
    WITH sterf_module as (
        SELECT
            id_module,
            id_nomenclature as id_type_site,
            module_code
        FROM gn_commons.t_modules
        LEFT JOIN ref_nomenclatures.t_nomenclatures ON cd_nomenclature = 'STERF'
        WHERE module_code = 'sterf'
    )
    INSERT INTO gn_monitoring.t_base_sites(
        base_site_name,
        base_site_code,
        id_type_site,
        geom
        geom_local
    )
    SELECT
        transect as base_site_name,
        'T' || SPLIT_PART(transect, '_', 2)  as base_site_code, -- à modifier en fonction du formatage de vos données
        id_type_site,
        ST_transform(geom_local, 4326) as geom,
        geom_local
    FROM _qgis.test_sterf
    LEFT JOIN sterf_module on module_code = 'sterf'
    GROUP BY transect, SPLIT_PART(transect, '_', 2), id_type_site, geom_local
    ;
    UPDATE _qgis.test_sterf i
        SET id_base_site = tbs.id_base_site
    FROM gn_monitoring.t_base_sites tbs WHERE transect = base_site_name
    -- rajouter un lien avec tbs.id_type_site si besoin
    ;
    -- Intégration des données supplémentaires pour les transects
    WITH sterf_module as (
        SELECT
            id_module,
            module_code
        FROM gn_commons.t_modules
        WHERE module_code = 'sterf'
    )
    INSERT INTO gn_monitoring.t_site_complements(
        id_base_site,
        id_sites_group,
        id_module,
        data
    )
    SELECT
        id_base_site,
        id_sites_group,
        id_module,
        jsonb_build_object(
            'hab_1', STRING_AGG(DISTINCT hab_1, ', '),
            'lisiere', CASE WHEN  STRING_AGG(DISTINCT hab_2, ', ') IS NULL THEN 'Non' ELSE 'Oui' END,
            'hab_2',  STRING_AGG(DISTINCT os_2, ', ')
        ) -- Il faudrait plutôt faire une formule avec LAST VALUE pour une intégration en masse mais ici non nécessaire
    FROM _qgis.test_sterf i 
    LEFT JOIN sterf_module on module_code = 'sterf'
    GROUP BY id_sites_group, id_base_site, id_module
    ;
    -- Passages
    WITH sterf_module as (
        SELECT
            id_module,
            module_code
        FROM gn_commons.t_modules
        WHERE module_code = 'sterf'
    )
    INSERT INTO gn_monitoring.t_base_visits(
        id_base_site,
        id_module,
        id_dataset,
        visit_date_min,
        id_digitiser,
        id_nomenclature_tech_collect_campanule,
        id_nomenclature_grp_typ,
        comments
    )
    SELECT
        id_base_site,
        id_dataset, 
        id_module,
        visit_date_min::date as visit_date_min,
        id_role as id_digitiser, -- ajouter l'observateur à la base ou mettre un id_role fixe
        ref_nomenclatures.get_id_nomenclature('TECHNIQUE_OBS'::character varying, '59'::character varying)  as id_nomenclature_tech_collect_campanule , -- Observation directe terrestre diurne (chasse à vue de jour)
        ref_nomenclatures.get_id_nomenclature('TYP_GRP'::character varying, 'PASS'::character varying) as id_nomenclature_grp_typ,  -- Passage
        visit_comment
    FROM _qgis.test_sterf i 
    LEFT JOIN sterf_module on module_code = 'sterf'
    LEFT JOIN utilisateurs.t_roles ON LOWER(determiner) = lower(nom_role) || ' ' || lower(prenom_role)
    LEFT JOIN gn_meta.t_datasets ON lower(dataset_name) LIKE '%sterf%' -- à modifier si nécessaire pour coller à la base GeoNature
    GROUP BY id_base_site, id_module, visit_date_min, id_role, id_dataset
    ;
    WITH sterf_module as (
        SELECT
            id_module,
            module_code
        FROM gn_commons.t_modules
        WHERE module_code = 'sterf'
    ),
    v as (
        SELECT
            *
        FROM gn_monitoring.t_base_visits tbv
        LEFT JOIN gn_monitoring.t_base_sites tbs USING (id_base_site)
        INNER JOIN sterf_module USING (id_module)
    )
    UPDATE _qgis.test_sterf i 
    SET id_base_visit = v.id_base_visit
    FROM v
    WHERE v.id_base_site = i.id_base_site 
    AND v.base_site_name = i.transect
    AND v.visit_date_min = i.visit_date_min::date
    ;
    -- Intégration des données supplémentaires pour les passages
    INSERT INTO gn_monitoring.t_visit_complements(
        id_base_visit,
        data
    )
    SELECT
        id_base_visit,
        jsonb_build_object(
            'num_passage', min(num_passage),
            'annee', min(annee),
            'heure_min', visit_date_min::time,
            'hab_1', STRING_AGG(DISTINCT hab_1, ', '),
            'lisiere', CASE WHEN  STRING_AGG(DISTINCT hab_2, ', ') IS NULL THEN 'Non' ELSE 'Oui' END,
            'hab_2',  STRING_AGG(DISTINCT os_2, ', '),
            'id_nomenclature_tp', STRING_AGG(DISTINCT tp, ', '),
            'id_nomenclature_cn', STRING_AGG(DISTINCT cn, ', '),
            'id_nomenclature_vt', STRING_AGG(DISTINCT vt, ', ')
        )
    FROM _qgis.test_sterf i
    GROUP BY id_base_visit, visit_date_min
    ;
    -- Observateurs du passage
    WITH obs as 
    (
        SELECT
            id_base_visit,
            determiner
        FROM _qgis.test_sterf i 
        GROUP BY id_base_visit, determiner
    )
    INSERT INTO gn_monitoring.cor_visit_observer(
        id_base_visit,
        id_role
    )
    SELECT
        id_base_visit,
        id_role
    FROM obs
    INNER JOIN utilisateurs.t_roles ON LOWER(determiner) = lower(nom_role) || ' ' || lower(prenom_role)
    ;
    -- observations
    INSERT INTO gn_monitoring.t_observations(
        id_base_visit,
        cd_nom,
        comments
    )
    SELECT
        id_base_visit,
        cd_nom, 
        nom_complet
    FROM _qgis.test_sterf i
    ORDER BY nom_complet
    ;
    UPDATE _qgis.test_sterf i 
    SET id_observation = o.id_observation
    FROM gn_monitoring.t_observations o
    WHERE o.cd_nom = i.cd_nom and i.id_base_visit = o.id_base_visit
    ;
    SELECT
        id_observation,
        jsonb_build_object(
            'effectif', effectif,
            'id_nomenclature_obs_technique', ref_nomenclatures.get_id_nomenclature('METH_OBS'::character varying, '0'::character varying),
            'id_nomenclature_determination_method', ref_nomenclatures.get_id_nomenclature('METH_DETERMIN'::character varying, '0'::character varying),
            'id_nomenclature_type_count', ref_nomenclatures.get_id_nomenclature('TYP_DENBR'::character varying, 'Co'::character varying) ,
            'id_nomenclature_obj_count', ref_nomenclatures.get_id_nomenclature('OBJ_DENBR'::character varying, 'IND'::character varying) 
        )
    FROM _qgis.test_sterf i 
    WHERE NOT id_observation IS NULL
    ;

