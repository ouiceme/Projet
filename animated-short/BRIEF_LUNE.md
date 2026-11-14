# Brief vidéo « Retourner sur la Lune » (Apollo → Artemis) — prêt à construire

Thème d'actualité, short vertical 1080x1920, 30 fps, français. La voix est DÉJÀ enregistrée : ne pas la refaire.
À construire par UN agent Fable (jamais Opus), sur le gabarit `src/videos/wald` ou `src/videos/comet`, selon `BRIEF_SOIR.md`.

## Voix prête (ne pas régénérer)
- `/root/remotion-project/public/voice_lune_fr.wav` (48 kHz mono, 55,56 s). Si le conteneur a été recyclé, la régénérer
  depuis `animated-short/assets/lune_fr.mp3` : `ffmpeg -i lune_fr.mp3 -ar 48000 -ac 1 public/voice_lune_fr.wav`.
- `/root/remotion-project/public/lune_fr.srt` (= `animated-short/assets/lune_fr.srt`).
- TOTAL images = ceil((durée_wav + 0.8) * 30) ≈ 1691. Vérifier avec ffprobe.

## Texte prononcé + horodatages (s, début de phrase) — pour caler plans, cartes et SFX
```
0.10  Personne n'a marché sur la Lune depuis plus de cinquante ans.
3.35  Juillet 1969 : Apollo 11.
6.63  Deux hommes posent le pied sur la Lune.
9.14  Décembre 1972 : Apollo 17.
12.76 Ce sont les derniers.
14.55 Ensuite, pendant un demi-siècle, plus aucun humain ne quitte l'orbite de la Terre.
19.31 En 2022, la mission Artemis 1 fait le tour de la Lune, sans équipage.
24.42 Et le premier avril 2026, Artemis 2 décolle avec quatre astronautes.
29.24 Ils contournent la Lune, sans s'y poser, et s'éloignent de la Terre plus que personne : + de 400 000 km.
35.95 Une dizaine de jours plus tard, ils sont de retour.
39.45 La suite ?
40.95 Artemis 3 doit tester l'amarrage en orbite terrestre, en 2027.
45.39 Le retour sur le sol lunaire, lui, est visé pour 2028.
49.87 Si le calendrier tient.
51.87 Alors levez les yeux : la prochaine page s'écrit en ce moment.
```

## Faits vérifiés (web, 2026-11-14) — respecter la prudence
- Apollo 11 : juillet 1969, premiers pas (Armstrong, Aldrin). Apollo 17 : décembre 1972, dernière mission habitée sur la Lune.
- 1972→2022 : aucun humain ne quitte l'orbite basse terrestre.
- Artemis 1 : 2022, vol d'essai SANS équipage autour de la Lune.
- Artemis 2 : décollage 1er avril 2026 (glissé depuis février à cause de fuites d'hydrogène), 4 astronautes
  (Reid Wiseman, Victor Glover, Christina Koch, Jeremy Hansen, Canada), survol de la Lune SANS alunissage,
  record de distance humaine > 400 000 km (≈ 252 750 miles, dépassant Apollo 13), amerrissage au large de San Diego
  le 10 avril 2026, ~10 jours de mission.
- Artemis 3 : vise à tester des manœuvres d'amarrage en orbite terrestre, ciblé 2027 ; alunissage habité repoussé
  (Artemis 4/5), visé 2028. **DATES NON FERMES** : à l'écran, étiqueter « prévu / visé », jamais acquis ; la voix dit
  déjà « si le calendrier tient ». Ne pas prononcer de date d'alunissage certaine.
- Neutralité : PAS de drapeau national sur les persos ; combinaison blanche générique, visière dorée.
- Sources : NASA (record de distance), aerospaceamerica.aiaa.org (calendrier Artemis III mi/fin 2027),
  deseret.com / globalsecurity.org (amerrissage 10 avril 2026). Les dates futures varient selon les sources → prudence.

## Échelles (1 unité = 1 m ; fiche en tête de story.ts)
Astronaute 1,70 m ; fusée SLS ~98 m (ou Saturn V ~111 m — en choisir une) ; module lunaire ~7 m ; capsule Orion ~3,3 m
de diamètre. La Terre et la Lune sont des disques d'illustration lointains (ne PAS prétendre à l'échelle réelle
Terre-Lune — le noter en commentaire). Le noir de l'espace doit être peuplé (étoiles, Terre/Lune, reflets), jamais vide.

## Plan des scènes (~10-12 plans, calés sur les horodatages)
1. Pas de tir de nuit, fusée éclairée (accroche « + de 50 ans »).
2. 1969 : surface lunaire grise, empreinte, astronaute, Terre bleue dans le ciel noir, module.
3. 1972 : « les derniers », rover simple possible.
4. Le demi-siècle : Terre en orbite basse, ISS stylisée ; schéma clair orbite basse vs Lune.
5. 2022 Artemis 1 : capsule contournant la Lune, siège vide visible (sans équipage).
6. 1er avril 2026 Artemis 2 : décollage, 4 astronautes dans la capsule, étiquette « record : + de 400 000 km ».
7. Retour : amerrissage capsule + parachutes.
8. La suite : frise animée « Artemis 3 — amarrage en orbite — 2027 (prévu) » puis « alunissage — 2028 (visé) ».
9. Chute aujourd'hui : une personne lève les yeux vers le ciel étoilé, la Lune au loin.
Au moins un schéma pédagogique animé (orbite basse vs trajectoire lunaire). Expressions suivant la narration.

## Technique
- Copier le dossier modèle en `src/videos/lune/`, réutiliser SANS modifier les modules moteur
  (ink, lensblur, grade, post, toon, cast, shade, lights, cardshade, build, paint, tex). Réécrire seulement
  `Lune.tsx`, `story.ts`, `world.ts`, `cards.tsx` ; enregistrer `LuneShort` dans `src/Root.tsx`.
- Chrome `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`, `--concurrency=2`, natif, jamais `--scale`.
- Rendu en tronçons détaché via un `/root/render_lune.sh` calqué sur `render_comet.sh` : concat qui RÉ-ENCODE
  (`-c:v libx264`, pas `-c copy`), sortie `yuv420p -profile:v main -movflags +faststart`, une seule instance à la fois,
  et qui attend d'abord la fin des autres rendus. Sorties dans le scratchpad `videos/` + `lune_fr.srt`.
- Contrôle qualité : 6 stills (un à la fois) comparés à `refs/` avant le rendu complet.
- Bruitages Python pur (modèle `assets/sfx/wald/sfx_gen.py`) : décollage, bip radio, pas sur le régolithe, amerrissage,
  musique discrète sous la voix.
- Livrer version épurée + sous-titrée + `.srt` ; commit/push sur `claude/analyze-worker-press-8Ny6J`.

## Défaut à éviter (vu sur wald)
Ne jamais lancer deux instances du script de rendu en même temps : l'écriture concurrente du MP4 de sortie le corrompt
(flux h264 cassé, « Invalid NAL unit size »). Une seule instance, et vérifier la sortie finale avec
`ffmpeg -v error -i out.mp4 -f null -` (0 ligne = sain) avant de livrer.
