/*
 * Tracking Matomo — injecté sur toutes les pages par `setup(app)` dans conf.py.
 *
 * Instance et idSite configurés ci-dessous.
 * Le tracker est configuré sans cookies (`disableCookies`), ce qui permet de se
 * passer de bandeau de consentement (exemption CNIL pour la mesure d'audience).
 */
var MATOMO_URL = "https://matomo.reserves-naturelles.org/";  // instance Matomo RNF, slash final inclus
var MATOMO_SITE_ID = "10";                                   // idSite du site dans Matomo

// Pas de tracking sur les builds locaux (`make livehtml`, build/html ouvert en file://)
if (["localhost", "127.0.0.1", ""].indexOf(window.location.hostname) === -1) {

var _paq = (window._paq = window._paq || []);
_paq.push(["disableCookies"]);
_paq.push(["setDoNotTrack", true]);  // n'envoie rien si le navigateur signale DNT/GPC
_paq.push(["trackPageView"]);
_paq.push(["enableLinkTracking"]);
(function () {
  _paq.push(["setTrackerUrl", MATOMO_URL + "matomo.php"]);
  _paq.push(["setSiteId", MATOMO_SITE_ID]);
  var d = document,
    g = d.createElement("script"),
    s = d.getElementsByTagName("script")[0];
  g.async = true;
  g.src = MATOMO_URL + "matomo.js";
  s.parentNode.insertBefore(g, s);
})();

}
