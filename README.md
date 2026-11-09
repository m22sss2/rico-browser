# Rico Browser

Rico Browser est une personnalisation de Firefox ESR pour Windows x64. Il propose un accueil et des paramètres aux couleurs Rico, un thème pour les pages de résultats, DuckDuckGo comme moteur initial et l’installation de l’extension uBlock Origin.

## Parcourir le code

- [`assets/`](./assets) contient l’accueil, les thèmes, le chat dessiné et les modules qui relient l’interface au moteur.
- [`overlay/`](./overlay) contient la configuration chargée par Firefox, dont le logo Windows, la page de nouvel onglet et les politiques d’extensions.
- [`src/`](./src) contient le lanceur Windows et le code qui génère et applique son icône.
- [`Build.ps1`](./Build.ps1) assemble Rico. [`Update-Rico.ps1`](./Update-Rico.ps1) remplace le moteur depuis un paquet Mozilla vérifié.
- [`Build-Installer.ps1`](./Build-Installer.ps1) produit l’installateur Windows à partir du navigateur assemblé avec [`RicoSetup.nsi`](./RicoSetup.nsi).

Le moteur de cette version de Rico est **Firefox ESR 153.6.0**. Ses sources complètes sont consultables à la [révision Mozilla exacte](https://hg.mozilla.org/releases/mozilla-esr153/file/d63de7b9609253a860fbb0050f678700f4cdc492/) et disponibles en [archive officielle](https://archive.mozilla.org/pub/firefox/releases/153.6.0esr/source/firefox-153.6.0esr.source.tar.xz). Ce dépôt contient la couche Rico et utilise le moteur ESR déjà compilé par Mozilla. Une nouvelle construction récupère l’ESR courant.

## Construire

Une fois Rico assemblé, ajoutez [NSIS](https://nsis.sourceforge.io/Download) au PATH et lancez `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Build-Installer.ps1`. Le résultat est `dist\Rico-Browser-Setup.exe`. Il installe Rico pour le compte Windows courant et ajoute un raccourci au menu Démarrer. La désinstallation depuis les paramètres de Windows conserve le dossier `profile`.

Installez 7-Zip, Python et Pillow (`python -m pip install Pillow`). Le lanceur se compile avec le compilateur .NET Framework de Windows. Dans PowerShell, lancez `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Build.ps1`, puis ouvrez `dist\Rico Browser\rico.exe`.

La construction télécharge Firefox ESR en français depuis Mozilla, vérifie la signature de son installateur et télécharge uBlock Origin depuis Mozilla Add-ons. Le moteur devient `rico.exe`. Son icône, sa description et le nom de produit Windows sont personnalisés, afin que le Gestionnaire des tâches affiche Rico. Ces modifications invalident la signature Authenticode du fichier moteur personnalisé. La signature du paquet Mozilla est vérifiée avant la personnalisation. Le lanceur et le moteur Rico construits localement ne sont pas signés par Rico.

Pour mettre le moteur à jour, quittez Rico Browser et lancez **Mettre a jour Rico.cmd**. L’outil vérifie les signatures Mozilla avant de réappliquer le nom et l’icône. Le profil est enregistré à part dans `profile`.

Le [registre des illustrations](./assets/rico-mascots.manifest) remplace les renards intégrés identifiés dans Firefox ESR, notamment dans les paramètres, l’accueil de première utilisation et les cartes de l’interface. La [variante IA](./assets/rico-cat-ai.svg) regarde vers le texte à gauche.

Le [module de traduction](./assets/modules/RicoBranding.sys.mjs) adapte les libellés des langues fournies avec le moteur et génère un cache local par version. Les URL, les mentions de marque officielles et les noms de services Mozilla distincts conservent leur forme originale.

Dans **Paramètres → Apparence → Personnaliser Rico**, choisissez un thème ou réglez le fond et l’accent. Le thème s’applique à l’accueil, aux paramètres et à la fenêtre du navigateur, et le profil mémorise votre choix. L’économie de mémoire évite de précharger des processus web. Les premiers sites peuvent s’ouvrir un peu plus lentement, et le moteur conserve l’isolation des sites.

## Licences

Le code et les illustrations propres à Rico sont sous licence MIT. Firefox et uBlock Origin sont des projets tiers et conservent leurs licences respectives. Le dépôt contient les sources de la personnalisation, tandis que le script de construction récupère les composants tiers auprès de leurs éditeurs.

- [Code source de Firefox](https://github.com/mozilla-firefox/firefox) · [MPL 2.0](https://www.mozilla.org/MPL/2.0/)
- [Code source de uBlock Origin et licence GPLv3](https://github.com/gorhill/uBlock)
- [Simple Icons](https://github.com/simple-icons/simple-icons) fournit les tracés SVG des raccourcis. Les logos identifient les sites de leurs titulaires respectifs.
