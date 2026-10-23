# MycoMy

Application cartographique personnelle d’aide à la prospection mycologique sur quatre zones : Bruebach, Porcelette, Châtel-Saint-Germain et Hayange.

Le site présente des zones de potentiel indicatif calculées à partir de données environnementales publiques. Il ne confirme ni la présence, ni l’identification, ni la comestibilité d’un champignon.

La version 13.2 ajoute une moyenne pondérée de l’humidité du sol sur 21 jours (avec un poids conservé pour les 72 dernières heures) dans les scores météo et de pousse. La version 13.1 ajoute le type de sol dominant et l’unité cartographique INRAE/GIS Sol aux mailles et aux observations personnelles. La proportion pédologique affichée décrit la composition estimée de l’unité de sol ; ce n’est pas une probabilité au point GPS.

Site : https://balkanist.github.io/MycoMy-Pages/

## Limitation par la sécheresse (v13.2)

Les scores météo, de pousse et de carte sont réduits et plafonnés après le calcul de leur potentiel initial. Un peuplement favorable, un bon sol ou des observations anciennes ne peuvent donc pas annuler la limitation. La récolte estimée hérite des pousses précédentes et ne dépasse pas le plafond hydrique du jour prévu.

L’état hydrique utilise au maximum les 21 jours précédant la date évaluée : humidité du sol superficiel (70 % de moyenne sur la période et 30 % sur les trois derniers jours), bilan pluie − ET₀ et proportion de jours secs. Les prévisions et les estimations de pousses anciennes utilisent chacune leur propre fenêtre glissante, sans utiliser de données postérieures à leur date.

Paramètres de l’heuristique dans `hydricStateForDay` :

- Sévérité de 0 à 1 : 65 % de manque d’humidité par rapport au minimum du profil d’espèce, 25 % de déficit climatique et 10 % de persistance des jours secs.
- Manque d’humidité maximal lorsque l’humidité tombe à 45 % du minimum du profil ; journée sèche sous 85 % de ce minimum. L’indice météo générique utilise un minimum de 0,20 m³/m³.
- Déficit climatique maximal à −60 mm sur 21 jours. Les fenêtres historiques plus courtes sont ramenées à un équivalent de 21 jours.
- Score final : minimum entre le score initial multiplié par `1 − 0,9 × sévérité` et le plafond `100 − 85 × sévérité` (arrondi entier).
- Un critère est utilisable à partir de 7 jours et d’au moins 75 % de dates renseignées. Une moyenne quotidienne du sol exige au moins 12 valeurs horaires valides. Les valeurs nulles ou manquantes ne sont pas converties en zéro ; les données insuffisantes sont signalées.

Ces seuils sont des choix de modélisation à calibrer avec les observations terrain, pas une validation de présence ou de fructification. Le bilan pluie − ET₀ reste un indicateur climatique et non une mesure du stock d’eau dans le sol.

Le chargeur principal et le module météo `runtime-v12.5.js` utilisent le même calcul. Vérification : `node --test tests/drought.test.cjs`.
