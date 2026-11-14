# Consigne pour un agent autonome local (Docker) — créer un short animé vertical

Cette consigne est indépendante du modèle : elle ne suppose ni Claude Code ni le mécanisme de « skills ».
L'agent a seulement besoin d'un shell, de lire et écrire des fichiers, et d'un accès internet sortant.
Donne-la telle quelle à l'agent, en remplaçant la section « Sujet » à la fin.

---

## 1. Ta mission

Produire un short éducatif vertical en français : 1080x1920, 30 images/s, 60 à 75 s, voix off, bruitages,
style « personnages cartoon 2D dans un monde 3D encré ». Tu écris le script, le code de la scène, tu rends la vidéo
et tu livres deux fichiers MP4 (épuré et sous-titré) plus le `.srt`.

Tu ne pars jamais de zéro : tu copies un short existant du dépôt et tu l'adaptes.

## 2. Environnement (image Docker)

```dockerfile
FROM node:20-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    git ffmpeg python3 python3-pip fonts-dejavu-core \
    libnss3 libatk-bridge2.0-0 libgtk-3-0 libgbm1 libasound2 libxshmfence1 libdrm2 \
 && pip3 install --break-system-packages edge-tts \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /work
```

Lancement conseillé : `docker run --shm-size=2g -v $PWD:/work ...` (Chrome plante avec le `/dev/shm` par défaut).
Avec une carte graphique exposée au conteneur, ajoute `--gl=angle` aux commandes de rendu ; sinon ne mets rien
(rendu logiciel, environ 5 s par image).

Mise en place, une seule fois :

```bash
git clone https://github.com/ouiceme/Projet.git && cd Projet
git checkout claude/analyze-worker-press-8Ny6J
cd animated-short && npm install --legacy-peer-deps
npx remotion browser ensure          # télécharge le Chrome de Remotion
mkdir -p public out
```

Le dépôt d'origine du style, à cloner seulement pour sa documentation :
`https://github.com/mromidev/claude-animated-shorts` (lire `SKILL.md` et `references/STYLE_BIBLE.md` comme de simples
documents ; rien à « installer »).

## 3. Ce que contient le dépôt

| Chemin | Rôle |
|---|---|
| `BRIEF_SOIR.md` | Cahier des charges artistique. Il fait autorité. |
| `refs/*.jpg` | Niveau visuel minimum à dépasser. |
| `src/videos/wald/` | Short de référence le plus récent. **C'est ton modèle.** |
| `src/videos/lego4/` | Autre short de référence validé. |
| `src/Root.tsx` | Liste des compositions Remotion. |
| `assets/render_wald.sh` | Script de rendu en tronçons, à copier. |
| `assets/sfx/wald/sfx_gen.py` | Générateur de bruitages et de musique, à copier. |

Dans un dossier de short, chaque fichier a un rôle fixe. Ne modifie que ceux de la première ligne :

| Fichiers | Tu y touches ? |
|---|---|
| `story.ts` (plans, durées, caméras, textes), `world.ts` et `build.ts` (décors), `cast.ts` (personnages et jeu), le composant principal `.tsx`, les cartes de texte | Oui : c'est là que vit ton histoire. |
| `toon.ts` (dessin des personnages), `ink.ts` (contour encré), `lensblur.ts`, `grade.ts`, `paint.ts`, `shade.ts`, `cardshade.ts`, `lights.ts` | Non. C'est le moteur du style. Le modifier casse la cohérence de la série. |

## 4. Étapes, dans l'ordre

Ne passe à l'étape suivante que lorsque le critère de l'étape est rempli.

**Étape 1 — Faits.** Cherche le sujet sur le web. Note chaque date, nom et chiffre avec sa source. Si un point est
discuté, formule-le prudemment (« selon le récit le plus répandu… ») ou retire-le.
*Critère : une liste de faits sourcés dans `assets/<nom>_sources.md`.*

**Étape 2 — Script.** 170 à 200 mots, phrases courtes, accroche dans les 3 premières secondes, une idée par phrase,
une chute qui parle au spectateur. Écris-le dans `assets/<nom>_narration_fr.txt`.
*Critère : chaque affirmation du script figure dans la liste de faits.*

**Étape 3 — Voix.**

```bash
edge-tts --voice fr-FR-HenriNeural --rate=+5% -f assets/<nom>_narration_fr.txt \
  --write-media assets/<nom>_fr.mp3 --write-subtitles assets/<nom>_fr.srt
ffmpeg -y -i assets/<nom>_fr.mp3 -ar 48000 -ac 1 public/voice_<nom>_fr.wav
cp assets/<nom>_fr.srt public/<nom>_fr.srt
ffprobe -v error -show_entries format=duration -of csv=p=0 public/voice_<nom>_fr.wav
```

*Critère : durée entre 60 et 75 s. Nombre d'images total = (durée + 0,8) x 30, arrondi.*

**Étape 4 — Scène.** `cp -r src/videos/wald src/videos/<nom>`, renomme le composant, ajoute la composition dans
`src/Root.tsx`. Découpe le script en 8 à 12 plans dans `story.ts`, en calant le début de chaque plan sur l'horodatage
du `.srt`. Construis 3 ou 4 décors dans `world.ts`.
*Critère : `npx tsc --noEmit` passe sans erreur.*

**Étape 5 — Contrôle sur images fixes.** Rends une image par plan, regarde-la, corrige.

```bash
npx remotion still src/index.ts <Composition> out/still_<n>.jpg --frame=<n>
```

Si tu ne peux pas voir les images (modèle sans vision), vérifie au moins qu'elles ne sont ni noires ni identiques :
`ffmpeg -i out/still_<n>.jpg -vf signalstats,metadata=print -f null - 2>&1 | grep YAVG` (attendu : entre 60 et 200),
et demande une relecture humaine avant le rendu complet.
*Critère : chaque plan respecte la liste de contrôle de la section 5.*

**Étape 6 — Bruitages.** Génère-les en Python pur (modules `wave`, `struct`, `math`), sur le modèle de
`assets/sfx/wald/sfx_gen.py`. Un son par action visible, calé sur l'horodatage du mot correspondant. Musique très discrète sous la voix.

**Étape 7 — Rendu complet.** Copie `assets/render_wald.sh`, adapte le nom de composition, les tronçons (environ 400
images chacun), les sons et leurs instants. Le script reprend les tronçons déjà faits s'il est interrompu : relance-le
simplement. **Un seul rendu complet par vidéo.** Ne lance jamais deux rendus en même temps.

**Étape 8 — Vérification et livraison.**

```bash
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,pix_fmt -of compact <fichier>.mp4
```

Attendu : `h264`, `1080`, `1920`, `yuv420p`, piste `aac`, durée égale à celle prévue. Livre `<nom>_fr.mp4`,
`<nom>_fr_ST.mp4` (sous-titres incrustés) et `<nom>_fr.srt`, puis fais un commit du code source.

## 5. Liste de contrôle par plan

- **Échelle** : une unité = un mètre. Adulte 1,70 m, porte 2 m. Écris les dimensions réelles des objets en tête de
  `story.ts`. Un objet ne change jamais de taille ; c'est la caméra qui se rapproche.
- **Profondeur** : avant-plan, sujet, arrière-plan. Aucun fond uni, aucun fond noir, aucune zone vide.
- **Lisibilité du sujet** : on comprend l'objet principal en une seconde. Pas de cadrage si serré qu'il devient une
  tache de couleur.
- **Personnages** : posés au sol dans le tiers bas, expression qui suit la narration, jamais devant un texte.
- **Texte** : sur pastille pleine, contraste d'au moins 4,5:1, six mots au plus, affiché au moment où la voix le dit.
- **Accessibilité** : pas de flash blanc plein écran, jamais d'information portée par la couleur seule
  (ajoute un symbole ou un mot).

## 6. Pièges déjà rencontrés

| Symptôme | Cause et solution |
|---|---|
| La vidéo ne se lit pas dans un navigateur ou sur téléphone | Sortie en `yuvj420p`. Réencode avec `-pix_fmt yuv420p -profile:v main -movflags +faststart`. |
| Chrome plante en cours de rendu | Mémoire. Baisse `--concurrency`, n'utilise pas `--scale`, augmente `--shm-size`. |
| Un rendu de plusieurs heures est perdu | Rends toujours en tronçons avec le script de reprise. |
| `edge-tts` échoue | Pas d'accès à `speech.platform.bing.com`. Derrière un proxy : `--proxy "$HTTPS_PROXY"`. |
| Modèles 3D externes introuvables | Ne télécharge aucun modèle. Construis les objets en géométrie simple (boîtes, cylindres) ; le contour encré fait le style. |
| Texte masqué par un personnage | Déplace le personnage ou la pastille, puis refais l'image fixe. |

## 7. Règles de conduite

- N'écris pas dans les fichiers moteur (section 3).
- Ne modifie pas les shorts existants ; travaille uniquement dans `src/videos/<nom>/`.
- Ne pousse rien vers un dépôt distant sans accord explicite de l'utilisateur.
- Si une étape échoue deux fois de suite, arrête-toi et rapporte l'erreur exacte au lieu de contourner.
- Rapport final : script définitif, sources, durée, instants des bruitages, résultat de `ffprobe`, et ce qui reste
  incertain ou non vérifié.

## 8. Sujet (à remplir par l'utilisateur)

- **Nom court** (sans espace, sert de nom de dossier) :
- **Titre du short** :
- **Idée à faire comprendre** :
- **Points de prudence factuelle** :
- **Décors souhaités** :
