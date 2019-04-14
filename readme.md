# Visual tests dashboard

## What is this ?
This is a node.js server providing :
- a dashboard of a set of visual regression tests pushed on the server from some testCafe tests.
- for each test a  report with the ability :
  - to validate in a click a screenshot as the new reference
  - to add masks to the screenshot to ignore parts of the image during comparisons

## Install

### Prerequisites
* node-canvas has some specific prerequisites, (here for Ubuntu/Debian)[https://github.com/Automattic/node-canvas/wiki/Installation:-Ubuntu-and-other-Debian-based-systems]
* node, yarn, webpack (installed globally)

###  For development and demo
```shell
yarn
yarn test:init # initiate a ./public with data for test & demo
yarn server:dev # http://localhost:8080
yarn server:dev PORT=XXXX # port can be specified
```
### For production
* The server thread must be allowed to write in `./public/`, that's there that all the data are stored (screenshots, parameters...)
* node-canvas install (here for Ubuntu/Debian)[https://github.com/Automattic/node-canvas/wiki/Installation:-Ubuntu-and-other-Debian-based-systems]
```shell
yarn
yarn server PORT=XXX # http://localhost:XXXX
```


## How to add visual tests & screenshots

### API
TO BE COMPLETED


## Development

### Code structure
The service is composed of 4 mains parts :
1. the nodejs server (expressjs) : `./src-server/server.js`
2. the comparison scripts : `./src-compare`
3. the dashboard web page, a simple page made of jade templates in `./src-dashboard/main.js` and served from `./src-dashboard/public`
4. the test report, a vue.js application in `./src-server/src`, built and pushed in `./src-server/public`


### All the commands :
```bash
yarn server [PORT=xxx] # starts the server [optionnal : precise port]
yarn server:dev        # start server in watch mode
yarn report:build      # builds the report
yarn report:dev        # builds the report in watch mode
yanr dashboard:build   # builds the dashboard
yanr dashboard:dev     # builds the dashboard in watch mode
yarn test:init         # copy ./test/public in ./public
```

### Typical development workflow
```bash
yarn test:init
# in another shell
yarn report:dev
# in another shell
yarn dashboar:dev
# in another shell
yarn server:dev
# now let's code
# and from time to time re init the process : kill your server and
yarn test:init
#  repeat as many times as you want :-)
yarn test:init && yarn server:dev
#  repeat as many times as you want :-)
```

### Data structure
- All the data are in the `./public` directory.
- There is a folder for each "suite", ie an expected serie of screenshots
- for each Suite, there a several PR, each having their screenshots to be compared to reference screenshots of the suite.
- A test is defined by 3 parameters :
  - `projectId` - the tested application ID - ex: "Drive" (could contain a version number or a release tag)
  - `suiteId` - the id of the sequence test for an app. Ex: "0004"
  - `prId` - unique id of the test.
- the path to a test is `[projectId]-[suiteId]/[prId]`.
- in the suite directory there are :
  - `before/` : the expected screenshts as they were before the PR (with same filename as in the `after/` directory)
  - `mask/` : contains the definition of eventual masks for some of the `before` screenshots
  - `suite-description.json` : the description of the suite `{projectId, suiteId, projectName, suiteName}`
  - `prId/` : a directory for each PR to be tested
- in a test folder there is :
  - `after/` : contains the screenshots of the last run
  - `diff/` : contains the differential images between `/before/` and `/after/`
  - `comparison-result.json` : a file with the test parameters
- `test-description.json` contains :
```JSON
{
  "projectId"    : "Drive",
  "suiteId"      : "0001",
  "prId"         : "pr-001",
  "projectName"  : "The Drive project",
  "suiteName"    : "Deletion of a folder 1 and other actions",
  "beforeVersion": 2,
  "date"         : 1555250794322,
  "type"         : "danger",
  "hasPassed"    : true,
  "hasFailed"    : true,
  "hasNew"       : true,
  "hasDeleted"   : true,
  "newItems"     : [
    {
      "raw"      : "sample.03.png",    // same structure in all xxxItems arrays
      "encoded"  : "sample.03.png",
      "hasMask"  : false
    }
  ],
  "deletedItems" : [],
  "passedItems"  : [],
  "failedItems"  : []
}
```

### Notes on Fabricjs
Fabricjs is a javascript library for image editing. On nodejs it uses node-canvas and there are some caveat regardings dependencies versions. It has been tested ok with `node 10.15.3`, `fabricjs ^2.7.0`, `"jsdom": "^13.2.0"` (jsdom version seems important)

### Note pour tests avec testcafe :
- installation de chrome dans debian : https://blog.tfrichet.fr/installer-google-chrome-sur-debian-8-jessie/


## TODO
* lien avec la pr : je suis pour avoir un lien vers les pr : on ne garde qu'un "run" par PR, on peut mettre le lien du test vers la PR dans github, et on peut tester le statut d'une pr (si fermée depuis longtemps : je supprime le test automatiquement)
* route pour supprimer les run de PR. Attention, que doit on faire d'une suite quand il n'y a plus de pr ? faut il supprimer la suite, et donc ses masques et les screenshots validés ?
* possibilité de mettre des paramètres de comparaison par image.
* vérifier la manière dont est utilisé le champs beforeVersion : je pense qu'il n'est pas mis à jour lors d'un changement ni des éléments d'une PR, ni d'une suite. Utile au démarrage pour ne pas tout recomparer...
* meilleure gestion des masques : centrer l'imag, la redimensionner, gérer un zoom
* https
* il y a un risque de surcharge si trop de requêtes sur le serveur : on pourrait ajouter une queue pour gérer les scanPr, il semble qu'il faudra choisir entre (qui s'appuient sur redis) :
  - https://github.com/bee-queue/bee-queue
  - https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md
  - ou bien une solution maison à base de debounce ??
* dans le report, brancher la search en haut à droite (facile mais inutile)


## Credits
* this code has been heavily re using reg-cli : https://github.com/reg-viz/reg-cli
