<template>
  <div class="wrapper">

    <div class="ui attached stackable menu">
      <div class="ui fluid container">
        <a class="item logo" href="/">
          <img src="../assets/cozy-logo-name-horizontal-blue.svg" alt="Cozy">
        </a>

        <div class="ui simple dropdown item" v-if="failedItems.length">
          <i class="remove red icon"></i> Failed items ({{failedItems.length}})
          <i class="dropdown icon"></i>
          <item-summaries :title="'Failed items'" :icon="'remove'" :color="'red'" :items="failedItems">
          </item-summaries>
        </div>

        <div class="ui simple dropdown item" v-if="newItems.length">
          <i class="file outline blue icon"></i> New items ({{newItems.length}})
          <i class="dropdown icon"></i>
          <item-summaries :title="'New items'" :icon="'file outline'" :color="'blue'" :items="newItems">
          </item-summaries>
        </div>

        <div class="ui simple dropdown item" v-if="deletedItems.length">
          <i class="trash outline icon"></i> Deleted items ({{deletedItems.length}})
          <i class="dropdown icon"></i>
          <item-summaries :title="'Deleted items'" :icon="'trash outline'" :color="'grey'" :items="deletedItems">
          </item-summaries>
        </div>

        <div class="ui simple dropdown item" v-if="passedItems.length">
          <i class="checkmark green icon"></i> Passed items ({{passedItems.length}})
          <i class="dropdown icon"></i>
          <item-summaries :title="'Passed items'" :icon="'checkmark'" :color="'green'" :items="passedItems">
          </item-summaries>
        </div>

        <div class="right item">
          <div class="ui input"><input type="text" placeholder="Search..."></div>
        </div>
      </div>
    </div>

    <div class="content">

      <table class="ui very compact table" id="comparison-description">
        <tr>
          <td>Project</td>
          <td>{{projectName}}</td>
        </tr>
        <tr>
          <td>Suite</td>
          <td>{{suiteName}}</td>
        </tr>
        <tr>
          <td>PR</td>
          <td>{{prId}}</td>
        </tr>
      </table>
      <div class="not-found" v-if="isNotFound">
        <div>
          No screenshots
        </div>
      </div>

      <div></div>

      <h2 class="ui header items-header red" v-if="failedItems.length">
        Changed items
      </h2>
      <div class="ui divider"  v-if="failedItems.length"></div>
      <item-details class="items" :icon="'remove'" :color="'red'" :items="failedItems" :openCapture="openCapture" :openComparison="openComparison" :openMask="openMask"
        :diffDir="diffDir" :actualDir="actualDir" :expectedDir="expectedDir" :shouldDisplaySetAsRef="true" :setImageAsReference="setImageAsReference">
      </item-details>

      <h2 class="ui header blue items-header" v-if="newItems.length">
        New items
      </h2>
      <div class="ui divider"  v-if="newItems.length"></div>
      <item-details class="items" :icon="'file outline'" :color="'blue'" :items="newItems" :openCapture="openCapture" :actualDir="actualDir" :openMask="openMask"
        :shouldDisplaySetAsRef="true" :setImageAsReference="setImageAsReference">
      </item-details>

      <h2 class="ui header items-header" v-if="deletedItems.length">
        Deleted items
      </h2>
      <div class="ui divider"  v-if="deletedItems.length"></div>
      <item-details class="items" :icon="'trash outline'" :color="'grey'" :items="deletedItems" :itemType="'deletedItem'" :openCapture="openCapture"
        :expectedDir="expectedDir" :shouldDisplaySetAsRef="true" :setImageAsReference="setImageAsReference" :deleteItem="deleteItem">
      </item-details>

      <h2 class="ui header items-header green" v-if="passedItems.length">
        Passed items
      </h2>
      <div class="ui divider"  v-if="passedItems.length"></div>
      <item-details class="items" :icon="'checkmark'" :color="'green'" :items="passedItems" :openCapture="openCapture"
        :actualDir="actualDir" :setImageAsReference="setImageAsReference" :openMask="openMask">
      </item-details>
    </div>

    <capture-modal  :src="modalSrc" class="toto">
    </capture-modal>

    <comparison-modal :src="modalSrc" :srcActual="selectedSrcActual" :srcExpected="selectedSrcExpected" :matching="selectedMatchingResult" :bg="modalBgSrc"></comparison-modal>

    <mask-modal :src="modalSrc" :srcActual="selectedSrcActual" :srcExpected="selectedSrcExpected"
      :matching="selectedMatchingResult" :bg="modalBgSrc" :hasMask="hasMask"  :sendMaskToServer="sendMaskToServer" :getMask="getMask">
    </mask-modal>

  </div>

</template>

<script>
import CaptureModal    from  './views/CaptureModal.vue';
import ComparisonModal from  './views/ComparisonModal.vue';
import MaskModal       from  './views/MaskModal.vue';
import ItemSummaries   from  './views/ItemSummaries.vue';
import ItemDetails     from  './views/ItemDetails.vue';
import {fabric}        from  'fabric'

const SEARCH_DEBOUNCE_MSEC = 50
const debounce             = require('lodash.debounce')
const path                 = require('path')
const workerClient         = require('./worker-client').default

function initState () {
  return {
    projectId   : window['__reg__'].projectId                    ,
    suiteId     : window['__reg__'].suiteId                      ,
    prId        : window['__reg__'].prId                         ,
    projectName : window['__reg__'].projectName                  ,
    suiteName   : window['__reg__'].suiteName                    ,
    actualDir   : 'after'                                        ,
    expectedDir : 'before'                                       ,
    diffDir     : 'diff'                                         ,
    search      : getSearchParams()                              ,
    modalSrc    : ""                                             ,
    hasMask     : ""                                             ,
    modalBgSrc  : null                                           ,
    isModalOpen : false                                          ,
    failedItems : searchItems('failedItems', getSearchParams())  ,
    passedItems : searchItems('passedItems', getSearchParams())  ,
    newItems    : searchItems('newItems', getSearchParams())     ,
    deletedItems: searchItems('deletedItems', getSearchParams()) ,
    lastRequestSequence          : null                          ,
    selectedRaw                  : ""                            ,
    selectedSrcActual            : ""                            ,
    selectedSrcExpected          : ""                            ,
    selectedMatchingResult       : null                          ,
    someVariableUnderYourControl : 1                             ,
  }
}

function searchItems(type, search) {
  return window['__reg__'][type]
    .filter(item => {
      const words = search.split(' ');
      return words.every(w => item.raw.indexOf(w) !== -1);
    });
}

function getSearchParams() {
  const s = location.search.match(/search=(.*?)(&|$)/);
  if (!s || !s[1]) return "";
  return decodeURIComponent(s[1]) || "";
}



export default {
  name: 'App',
  components: {
    'capture-modal'   : CaptureModal,
    'comparison-modal': ComparisonModal,
    'mask-modal'      : MaskModal,
    'item-summaries'  : ItemSummaries,
    'item-details'    : ItemDetails,
  },
  data: initState,
  created: function () {
    workerClient.subscribe(data => {
      if (this.lastRequestSequence === data.seq && this.isModalOpen) {
        this.selectedMatchingResult = data.result;
      }
    });
  },
  computed: {
    isNotFound: function () {
      return this.failedItems.length === 0 &&
        this.passedItems.length === 0 &&
        this.newItems.length === 0 &&
        this.deletedItems.length === 0;
    },
  },
  // mounted: function () {
  //   setTimeout(
  //     ()=> this.openMask('sample.02.should_be_2_but_1_in_before.png', true) // TODO remove
  //     , 10
  //   )
  // },
  methods: {
    openCapture(src, bg) {
      this.modalSrc    = src
      this.modalBgSrc  = bg
      this.isModalOpen = true
      this.$modal.push('capture')
    },

    openComparison(src) {
      this.modalSrc = src;
      this.selectedSrcActual   = path.join(this.actualDir   || '', src || '');
      this.selectedSrcExpected = '../before/' + src
      console.log('app.vue openComparison', src, this.selectedSrcActual, this.selectedSrcExpected);
      this.lastRequestSequence = workerClient.requestCalc({
        raw: src,
        actualSrc: this.selectedSrcActual,
        expectedSrc: this.selectedSrcExpected
      });
      this.isModalOpen = true;
      this.$modal.push('comparison')
    },

    openMask(src, hasMask) {
      this.modalSrc = src
      this.hasMask  = hasMask
      this.selectedSrcActual   = path.join(this.actualDir   || '', src || '');
      this.selectedSrcExpected = path.join(this.expectedDir || '', src || '');
      this.isModalOpen = true;
      this.$modal.push('mask')
    },

    getMask(fileName, canvasF){
      const xhr = new XMLHttpRequest()
      xhr.onreadystatechange = function(event) {
        if (this.readyState === XMLHttpRequest.DONE) {
          if (this.status === 200) {
            const response = JSON.parse(this.response)
            response.objects.forEach(obj=>{
              if (obj.type!=='rect') return
              obj.strokeWidth = 0
              canvasF.add(new fabric.Rect(obj))
            })
          } else {
            console.log("Status de getMask in app.vue la réponse:", this.status, this.statusText);
          }
        }
      };
      xhr.open('GET', `/api/${this.projectId}/${this.suiteId}/mask/${fileName}`, true)
      xhr.send(null)
    },

    onMaskEvent(msg){
      console.log('onMaskEvent', msg);
    },

    close() {
      this.isModalOpen = false;
      this.$modal.pop();
      this.selectedSrcActual = "";
      this.selectedSrcExpected = "";
      this.selectedMatchingResult = null;
    },

    inputSearch(e) {
      this.search = e.target.value;
      this.filter(this.search);
      history.pushState('', '', `?search=${encodeURIComponent(this.search)}`);
    },

    deleteMaskFromServer(filename){
      console.log('mask deletion requested');
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/${this.projectId}/${this.suiteId}/${this.prId}/mask/delete/${filename}`, true)
      xhr.setRequestHeader('Content-type','application/json');
      xhr.send(null)
    },

    sendMaskToServer(filename, blob) {
      if (!blob) return this.deleteMaskFromServer(filename)
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/${this.projectId}/${this.suiteId}/${this.prId}/mask/save/${filename}`, true)
      xhr.setRequestHeader('Content-type','application/json');
      xhr.send(blob)
      xhr.onreadystatechange = ()=>{
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status === 200) {
            // console.log('send mask received response', xhr.response)
            window['__reg__'] = JSON.parse(xhr.response)
            this.failedItems  = searchItems('failedItems' , getSearchParams())
            this.passedItems  = searchItems('passedItems' , getSearchParams())
            this.newItems     = searchItems('newItems'    , getSearchParams())
            this.deletedItems = searchItems('deletedItems', getSearchParams())
          } else {
            console.log("Status de getMask in app.vue la réponse:", xhr.status, xhr.statusText);
          }
        }
      }
    },

    setImageAsReference(fileName) {
      // 1) find the file item
      var movedItem, itemCategorie
      ['failedItems', 'newItems'].forEach( cat => {
        const it = window['__reg__'][cat].find(item=>item.raw===fileName)
        if (it) {
          itemCategorie = cat
          movedItem  = it
        }
      })
      // 2) move file item into passedItems
      const fromItems   = window['__reg__'][itemCategorie]
      window['__reg__']['passedItems'].push(movedItem)
      window['__reg__'][itemCategorie]=fromItems.filter(item=>item.raw!==fileName)
      this[itemCategorie] = searchItems(itemCategorie, getSearchParams())
      this.passedItems = searchItems('passedItems', getSearchParams()).sort((a,b)=>b.raw<a.raw)
      // 3) request the move of the file in the reference folder
      const req = new XMLHttpRequest()
      req.open('POST', `/api/${this.projectId}/${this.suiteId}/${this.prId}/set-as-reference/${fileName}`, true)
      req.send(null)
    },

    filter: debounce(function(search) {
      ['failedItems', 'passedItems', 'newItems', 'deletedItems'].forEach(type => this[type] = searchItems(type, search));
    }, SEARCH_DEBOUNCE_MSEC),

    deleteItem(fileName){
      console.log("request deletion of ", fileName);
      // 1) find the file item
      const deletedItems = window['__reg__']['deletedItems'].find(item=>item.raw===fileName)
      // 2) remove file item
      const newDeletedItems   = window['__reg__']['deletedItems'].filter(item=>item.raw!==fileName)
      window['__reg__']['deletedItems'] = newDeletedItems
      this['deletedItems'] = searchItems('deletedItems', getSearchParams())
      // 3) request the deletion of the file (before) and mask
      const req = new XMLHttpRequest()
      req.open('POST', `/api/${this.projectId}/${this.suiteId}/${this.prId}/delete-from-before/${fileName}`, true)
      req.send(null)
    }
  }
}
</script>

<style scoped src="./styles/common.css"></style>
<style scoped>
#comparison-description {
  max-width: 55em;
  margin-top: 24px;
}

.not-found {
  min-height: calc(100% - 80px);
  color: #aaa;
  font-size: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 3rem;
}

.backdrop {
  min-height: 100vh;
  min-width: 100vw;
  position: fixed;
  z-index: 2000000;
  top: 0;
}

.main-header {
  width: 100%;
  height: 50px;
  padding: 0 30px;
  border-bottom: solid 1px #F5F2F0;
  position: fixed;
  display: flex;
  align-items: center;
  /* background: #fcfcfc; background-color: rgb(41, 126, 241); */
  background: rgb(41, 126, 241);
  justify-content: space-between;
  top: 0;
  z-index: 1000;
}

.summaries {
  margin-top: 30px;
}

a>i.github {
  font-size: 28px;
  margin: 0 20px 0;
  color: #333;
}

.input {
  height: 28px;
  width: 240px;
}

.content {
  min-height: calc(100vh - 270px);
  padding: 0 30px;
}

.link {
  font-size: 13px;
  display: block;
}

.branding>a {
  display: flex;
  align-items: center;
}

.branding>a>img{
  margin-left: -6px;
  margin-right: 2em;
  height: 32px;
}

.logo {
  margin-left: .35em  !important;
  padding-top: 0  !important;
  padding-bottom: 0  !important;
  border-left:0  !important;
  margin-left:0  !important;
}
.logo>img{
  width:5em !important
}

.detail {
  margin-top: 60px;
}

.footer {
  width: 100%;
  padding: 60px 30px;
  background: #fcfcfc;
  font-size: 14px;
  color: #aaa;
  text-align: center;
}
</style>
