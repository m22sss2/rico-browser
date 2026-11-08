# Rico Browser

Rico Browser est une personnalisation de Firefox ESR pour Windows x64. Il propose un accueil et des paramètres aux couleurs Rico, un thème pour les pages de résultats, DuckDuckGo comme moteur initial et l’installation de l’extension uBlock Origin.

## Parcourir le code

- [`assets/`](./assets) contient l’accueil, les thèmes, le chat dessiné et les modules qui relient l’interface au moteur.
- [`overlay/`](./overlay) contient la configuration chargée par Firefox, dont le logo Windows, la page de nouvel onglet et les politiques d’extensions.
- [`src/`](./src) contient le lanceur Windows et le code qui génère et applique son icône.
- [`Build.ps1`](./Build.ps1) assemble Rico. [`Update-Rico.ps1`](./Update-Rico.ps1) remplace le moteur depuis un paquet Mozilla vérifié.

Le moteur de cette version de Rico est **Firefox ESR 153.6.0**. Ses sources complètes sont consultables à la [révision Mozilla exacte](https://hg.mozilla.org/releases/mozilla-esr153/file/d63de7b9609253a860fbb0050f678700f4cdc492/) et disponibles en [archive officielle](https://archive.mozilla.org/pub/firefox/releases/153.6.0esr/source/firefox-153.6.0esr.source.tar.xz). Ce dépôt contient la couche Rico et utilise le moteur ESR déjà compilé par Mozilla. Une nouvelle construction récupère l’ESR courant.

## Construire

Installez 7-Zip, Python et Pillow (`python -m pip install Pillow`). Le lanceur se compile avec le compilateur .NET Framework de Windows. Dans PowerShell, lancez `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Build.ps1`, puis ouvrez `dist\Rico Browser\rico.exe`.

La construction télécharge Firefox ESR en français depuis Mozilla, vérifie la signature de son installateur et télécharge uBlock Origin depuis Mozilla Add-ons. Le moteur est renommé et son icône PE est remplacée. Cette dernière opération invalide la signature Authenticode du fichier moteur personnalisé. La signature du paquet Mozilla est vérifiée avant la personnalisation. Le lanceur et le moteur Rico construits localement ne sont pas signés par Rico.

Pour mettre le moteur à jour, quittez Rico Browser et lancez **Mettre a jour Rico.cmd**. L’outil vérifie les signatures Mozilla avant de réappliquer le nom et l’icône. Le profil est enregistré à part dans `profile`.

L’illustration vectorielle [`assets/rico-cat.svg`](./assets/rico-cat.svg) est utilisée dans la carte « Navigateur par défaut » des paramètres.

## Licences

Le code et les illustrations propres à Rico sont sous licence MIT. Firefox et uBlock Origin sont des projets tiers et conservent leurs licences respectives. Le dépôt contient les sources de la personnalisation, tandis que le script de construction récupère les composants tiers auprès de leurs éditeurs.

- [Code source de Firefox](https://github.com/mozilla-firefox/firefox) · [MPL 2.0](https://www.mozilla.org/MPL/2.0/)
- [Code source de uBlock Origin et licence GPLv3](https://github.com/gorhill/uBlock)
