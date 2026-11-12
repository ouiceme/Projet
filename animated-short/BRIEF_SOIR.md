# Cahier des charges — production du soir (shorts verticaux 1080x1920, 30 fps, FR)

## Règles de coût
- Tout sur Fable 5.2. Aucun sous-agent Opus. Un agent par vidéo, lancés l'un après l'autre.
- Une seule passe de rendu par vidéo : script et visuels figés avant le rendu complet, contrôle sur stills.
- Rendu natif (pas de --scale), `--concurrency=2`, Chrome : `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`.
- Si la limite d'usage est atteinte : s'arrêter proprement, noter où on en est, reprendre le soir suivant.

## Ordre
1. LEGO v4 : même voix, même timing, mêmes plans que la v3 (`src/videos/lego/Lego.tsx`), nouveau style visuel.
2. « Les trous sont au mauvais endroit » (biais du survivant, Abraham Wald, 1943).
3. « Pourquoi les hublots sont ronds » (de Havilland Comet, 1954).
4. « Pourquoi ton clavier commence par AZERTY ».

## Direction artistique commune (conditions du client)
- **Échelles respectées** : une unité = un mètre. Fiche d'échelle en tête de chaque fichier
  (personnage adulte 1,70 m, porte 2 m, B-17 : 22,7 m de long et 31,6 m d'envergure,
  Comet 1 : 28 m de long, hublot environ 40 cm, machine à écrire environ 30 cm).
  Aucun objet ne change de taille relative d'un plan à l'autre ; les changements de taille passent par la caméra.
- **Fond riche, jamais uni** : au moins trois plans de profondeur par scène (avant-plan, sujet, arrière-plan),
  ciel en dégradé avec nuages, sol texturé, décor lié au lieu (hangar, piste, atelier, bureau),
  trames de points et lignes de vitesse façon manga aux moments forts.
- **Style manga, formes basiques** : contour encré sombre d'épaisseur variable, aplats en deux tons
  (lumière et ombre nettes), reflets spéculaires brillants sur le plastique et le métal.
- **Personnages simples mais cohérents** : un seul système de personnage pour toute la série
  (mêmes proportions, même trait, mêmes yeux), plus soigné que dans les shorts du pont et Dunning-Kruger.
  Résolution de texture suffisante pour ne jamais être floue ; pas de très gros plan.
- **Lisibilité** : aucun texte masqué par un objet, texte sur pastille pleine, contraste d'au moins 4,5:1,
  pas de flash blanc plein écran.
- **Rythme** : voix `fr-FR-HenriNeural` à `--rate=+5%` (environ 2,7 mots par seconde), accroche dans les 3 premières secondes,
  60 à 75 s par vidéo. Bruitages synchronisés aux actions.

## Référence visuelle cible (prioritaire)
Regarder d'abord les cinq images de `animated-short/refs/` : c'est le niveau à atteindre.
Elles viennent d'une vidéo faite avec le même skill. Ce qui fait ce rendu :
- **Personnages** : grosse tête ronde, contour prune épais, casquette à visière, yeux en points ou grands ronds,
  bouche expressive, torse en haricot à boutons avec léger dégradé, membres en traits fins, mains en points,
  petites chaussures. Une couleur de tenue par personnage. C'est exactement ce que dessine `toon.ts`.
- **Monde** : vraie géométrie 3D avec contour encré sur toutes les arêtes (`ink.ts`), couleurs saturées,
  textures peintes (haie, volets, caisse rayée, carrelage), ombres portées au sol.
- **Image** : arrière-plan flouté par la profondeur de champ (`lensblur.ts`), étalonnage chaud et vignette (`grade.ts`),
  personnages posés au sol dans le tiers bas, caméra basse, échelles cohérentes.

**Conséquence** : ne plus écrire de scène simplifiée à la main. Repartir du gabarit complet du skill
(`~/.claude/skills/cartoon-3d-short/templates/bridge/` : `Bridge.tsx`, `world.ts`, `build.ts`, `cast.ts`, `toon.ts`,
`ink.ts`, `lensblur.ts`, `grade.ts`, `paint.ts`, `cardshade.ts`, `shade.ts`, `lights.ts`) et lire `SKILL.md`.
Étape 0 de la soirée : faire rendre un still du gabarit du pont tel quel. Les modèles Kenney sont optionnels
(le chargeur ignore ceux qui manquent) ; les remplacer par de la géométrie encrée. Ensuite seulement adapter
l'histoire, le monde et la distribution pour chaque vidéo. Si le skill a disparu : le recloner depuis
`mromidev/claude-animated-shorts`.

## Objectif : dépasser la référence
Les images de référence sont le plancher, pas la cible. Leurs faiblesses à ne pas reproduire :
fond noir vide (ref4), grandes surfaces unies sans détail (ref3), décors peu peuplés.
Leviers pour faire mieux :
- Chaque plan a un décor complet et habité (accessoires, second plan animé, nuages, reflets), aucune zone vide.
- Jeu des personnages : expressions qui changent avec la narration, regards, anticipation avant chaque action.
- Pédagogie visuelle : un schéma animé clair par idée clé (niveau de la vue en coupe tube-tenon de LEGO v3).
- Son : bruitages synchronisés et musique discrète sous la voix (`templates/audio/` du skill), voix toujours dominante.
- Reflets brillants sur plastique et métal, que la référence n'a pas.
- Contrôle qualité avant le rendu complet : planche comparant 6 stills aux images de `refs/`.
  Tant qu'un still est moins bon que la référence, corriger ; ne lancer le rendu complet qu'ensuite.

## Dépôts GitHub sur lesquels s'appuyer
- `mromidev/claude-animated-shorts` (skill déjà installé dans `~/.claude/skills/cartoon-3d-short/`) :
  `toon.ts` pour les personnages, `ink.ts` pour le contour encré, `paint.ts` pour les textures peintes,
  `lights.ts`, `shade.ts`, et `references/STYLE_BIBLE.md` pour la formule de script et d'image.
  Des copies sont dans `src/videos/molasses/`.
- `remotion-dev/remotion` avec `@remotion/three` : moteur de rendu, déjà installé.
- `heygen-com/hyperframes` et `motion-canvas/motion-canvas` : s'en inspirer pour les enchaînements de texte et de cartes,
  sans les installer.

## Véracité
Chaque script est vérifié sur le web avant la voix (dates, noms, chiffres), formulation prudente en cas de doute.
- Wald : le schéma aux points rouges est une illustration moderne, pas ses données.
- Comet : la rupture étudiée par l'enquête partait d'une ouverture du toit ; ne pas affirmer
  que les hublots passagers carrés sont la cause unique.
- AZERTY : l'origine exacte est mal documentée ; l'histoire du blocage des tiges du QWERTY est discutée.

## Livraison pour chaque vidéo
- Encodage `yuv420p`, profil Main, `+faststart`, copié dans le scratchpad `videos/`.
- Une version épurée, une version sous-titrée (caisson noir, `Fontsize=6`, `MarginV=110`), le `.srt`.
- Source commitée et poussée sur la branche `claude/analyze-worker-press-8Ny6J`.

## Si le conteneur a été recyclé
Recréer `/root/remotion-project` : `package.json` et `src/` depuis `animated-short/`, `npm install --legacy-peer-deps`,
voix dans `public/` reconverties depuis `animated-short/assets/*.mp3` (48 kHz mono), `pip install edge-tts`
(proxy : `--proxy "$HTTPS_PROXY"`).
