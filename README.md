# Rico Browser

Rico Browser est une personnalisation de Firefox ESR pour Windows x64. Il propose un accueil et des paramètres aux couleurs Rico, un thème pour les pages de résultats, DuckDuckGo comme moteur initial et l’installation de l’extension uBlock Origin.

## Télécharger les sources

[Rico-Browser-Sources.zip](./Rico-Browser-Sources.zip) contient les fichiers sources et le script de construction. Extrayez le ZIP avant de lancer la construction.

## Construire

Installez 7-Zip, Python et Pillow (`python -m pip install Pillow`). Le lanceur se compile avec le compilateur .NET Framework de Windows. Dans PowerShell, lancez `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Build.ps1`, puis ouvrez `dist\Rico Browser\rico.exe`.

La construction télécharge Firefox ESR en français depuis Mozilla, vérifie la signature de son installateur et télécharge uBlock Origin depuis Mozilla Add-ons. Le moteur est renommé et son icône PE est remplacée. Cette dernière opération invalide la signature Authenticode du fichier moteur personnalisé. La signature du paquet Mozilla est vérifiée avant la personnalisation. Le lanceur et le moteur Rico construits localement ne sont pas signés par Rico.

Pour mettre le moteur à jour, quittez Rico Browser et lancez **Mettre a jour Rico.cmd**. L’outil vérifie les signatures Mozilla avant de réappliquer le nom et l’icône. Le profil est enregistré à part dans `profile`.

L’illustration vectorielle `assets/rico-cat.svg` est incluse. Pour utiliser votre propre photo du chat dans les paramètres, placez-la dans le dossier de l’application sous `assets/mascot-local.jpg`, puis redémarrez Rico.

## Licences

Le code et les illustrations propres à Rico sont sous licence MIT. Firefox et uBlock Origin sont des projets tiers et conservent leurs licences respectives. Le dépôt contient les sources de la personnalisation, tandis que le script de construction récupère les composants tiers auprès de leurs éditeurs.

- [Code source de Firefox](https://github.com/mozilla-firefox/firefox) · [MPL 2.0](https://www.mozilla.org/MPL/2.0/)
- [Code source de uBlock Origin et licence GPLv3](https://github.com/gorhill/uBlock)
