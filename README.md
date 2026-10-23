# MycoMy

Application cartographique personnelle d’aide à la prospection mycologique sur quatre zones : Bruebach, Porcelette, Châtel-Saint-Germain et Hayange.

Le site présente des zones de potentiel indicatif calculées à partir de données environnementales publiques. Il ne confirme ni la présence, ni l’identification, ni la comestibilité d’un champignon.

La version 13.3 rend les périodes de fructification limitantes pour chaque espèce : hors période habituelle, pousse, récolte et potentiel cartographique sont à 0/100. La version 13.2 ajoute une moyenne pondérée de l’humidité du sol sur 21 jours (avec un poids conservé pour les 72 dernières heures) dans les scores météo et de pousse. La version 13.1 ajoute le type de sol dominant et l’unité cartographique INRAE/GIS Sol aux mailles et aux observations personnelles. La proportion pédologique affichée décrit la composition estimée de l’unité de sol ; ce n’est pas une probabilité au point GPS.

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

## Calendrier de fructification (v13.3)

Chaque espèce possède une liste explicite de mois dans `FRUITING_MONTHS`. Les fenêtres ci-dessous sont les périodes de modélisation retenues pour les zones du Grand Est ; elles couvrent la saison habituelle avec certaines marges de début et de fin. Elles ne décrivent pas une impossibilité biologique absolue et ne sont pas transposables à tous les climats.

| Espèce | Période retenue |
|---|---|
| Morille commune | mars à mai |
| Morille conique | mars à juin |
| Cèpe de Bordeaux | juin à novembre |
| Cèpe d’été | mai à octobre |
| Cèpe des pins | mai à novembre |
| Cèpe bronzé | juin à octobre |
| Girolle | juin à novembre |
| Trompette de la mort | juin à novembre |
| Pied-de-mouton | juillet à décembre |
| Coulemelle | juin à novembre |
| Mousseron de la Saint-Georges | mars à juin |
| Chanterelle en tube | août à décembre |
| Lactaire délicieux | août à novembre |
| Oronge | juin à octobre |
| Pleurote en huître | septembre à mars |
| Pholiote du peuplier | avril à novembre |
| Bolet jaune | juillet à novembre |
| Sparassis crépu | juillet à novembre |
| Bolet bai | juin à novembre |
| Collybie à pied velouté | octobre à mars |
| Russule charbonnière | juin à novembre |

Hors période, les scores de pousse, de carte et de récolte valent 0/100, après tous les bonus météo, de biotope, GBIF et personnels. Les observations mensuelles GBIF peuvent affiner un score à l’intérieur de la période, jamais ouvrir un mois exclu. L’indice météo général reste indépendant de l’espèce ; son intitulé le précise dans l’application.

Le jour courant est évalué à la date de Paris, même lorsque les données météo historiques s’arrêtent la veille. Chaque jour de prévision possède sa propre vérification de calendrier, y compris au changement de mois et au passage décembre–janvier. La récolte estimée ne prolonge pas artificiellement la saison avec les pousses passées. Lorsqu’aucun jour des sept prévisions n’est favorable, aucun « meilleur créneau » n’est conseillé.

Références de cadrage consultées le 23 octobre 2026 :

- [Dossier Morchella, observations de Francini Mycologie](https://www.francini-mycologie.fr/DOSSIERS_SPECIAUX/Morchella.html) ; [observation montagnarde de juin d’une morille du groupe conique](https://www.francini-mycologie.fr/MYCOLOGIE/LES_AUTRES_CHAMPIGNONS/Morchella_deliciosa.html).
- [First Nature : morille commune](https://www.first-nature.com/fungi/morchella-esculenta.php), [morille noire](https://www.first-nature.com/fungi/morchella-elata.php), [mousseron de la Saint-Georges](https://www.first-nature.com/fungi/calocybe-gambosa.php), [cèpe d’été](https://www.first-nature.com/fungi/boletus-reticulatus.php), [girolle](https://www.first-nature.com/fungi/cantharellus-cibarius.php) et autres fiches des espèces du catalogue. Ces fiches précisent des variations entre régions ; les mois retenus ici sont des fenêtres de modélisation locales.
- [Mycocharentes : pleurote en huître](https://www.mycocharentes.fr/pdf1/420.pdf), [collybie à pied velouté](https://www.mycocharentes.fr/pdf1/355.pdf).

Vérification : `node --test tests/*.test.cjs` ; tests des 21 calendriers, morilles automnales malgré une météo parfaite et un pic GBIF, fin et début de saison, espèces hivernales, affichage du module actif et fuseau de Paris.
