:orphan:

.. Page hors sommaire : atteignable par le lien discret du pied de page
   (_templates/footer.html).

===============================
Vie privée et mesure d'audience
===============================

Ce site mesure sa fréquentation avec `Matomo <https://matomo.org/>`_, un outil
libre hébergé par Réserves Naturelles de France sur ses propres serveurs. Les
statistiques servent uniquement à savoir quels tutos sont consultés, afin
d'orienter les prochains ateliers. Elles ne sont ni cédées ni revendues à des
tiers.

Ce qui est collecté
-------------------

* les pages consultées, la date, l'heure et la durée de consultation ;
* le site ou le moteur de recherche d'où vous venez — son domaine seulement,
  jamais l'adresse complète de la page ;
* les mots-clés que vous saisissez dans le moteur de recherche de ce site ;
* le type d'appareil, le navigateur, la résolution d'écran et la langue ;
* votre adresse IP, anonymisée avant enregistrement.

Ce qui ne l'est pas
-------------------

* **Aucun cookie n'est déposé** sur votre appareil par la mesure d'audience —
  c'est pourquoi ce site n'affiche pas de bandeau de consentement.
* Aucun suivi d'un site à l'autre : les statistiques s'arrêtent aux frontières
  de ce site.
* Aucun profil individuel : le journal des visites et le profil du visiteur
  sont désactivés dans Matomo, seules des statistiques agrégées sont
  consultables.
* Les données brutes sont supprimées automatiquement au bout d'un an — bien
  en deçà du plafond de 25 mois fixé par la CNIL.

Cette configuration suit le guide de la CNIL pour les outils de mesure
d'audience exemptés de consentement (délibération du 17 septembre 2020).

S'opposer à la mesure d'audience
--------------------------------

Deux moyens, au choix :

**Activer « Do Not Track » dans votre navigateur.** Ce signal est respecté par
ce site : aucune donnée n'est alors envoyée. C'est la méthode la plus fiable
ici, puisqu'elle ne dépend d'aucun cookie.

**Ou utiliser le bouton ci-dessous.** Il enregistre votre refus dans un cookie
d'exclusion — il doit donc rester déposé sur votre navigateur pour continuer à
faire effet.

.. raw:: html

   <div id="matomo-opt-out"></div>
   <script src="https://matomo.reserves-naturelles.org/index.php?module=CoreAdminHome&action=optOutJS&divId=matomo-opt-out&language=fr&showIntro=1"></script>

Vos droits
----------

Vous disposez d'un droit d'accès, de rectification et d'opposition sur ces
données. Compte tenu de l'anonymisation appliquée, RNF n'est généralement pas
en mesure de relier une visite à une personne identifiée.

Pour toute question sur ce sujet :

.. raw:: html

   <p class="contact-rgpd">
     <a id="contact-rgpd-lien" href="#">Nous écrire</a>
     <noscript>support [arobase] reserves-naturelles.org</noscript>
   </p>
   <script>
     // Adresse assemblée à l'affichage : elle n'apparaît pas en clair dans le
     // HTML servi, ce qui la met hors de portée des robots collecteurs de spam.
     (function () {
       var lien = document.getElementById("contact-rgpd-lien");
       var nom = "support";
       var domaine = "reserves-naturelles.org";
       lien.href = "mailto:" + nom + "@" + domaine + "?subject=" +
         encodeURIComponent("Vie privée - tutos atelier SI");
     })();
   </script>
