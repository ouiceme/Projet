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
