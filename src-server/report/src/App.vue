d c<template>
  <div class="wrapper">

      <div class="ui attached stackable menu">
        <div class="ui fluid container">
          <a class="item logo" href="/">
            <img src="../assets/cozy-logo-name-horizontal-blue.svg" alt="Cozy">
          </a>
          <a class="item">
            <i class="crosshairs icon"></i> Visual test of : {{testId}}
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
      <item-details class="items" :icon="'trash outline'" :color="'grey'" :items="deletedItems" :openCapture="openCapture"
        :expectedDir="expectedDir" :setImageAsReference="setImageAsReference">
      </item-details>

      <h2 class="ui header items-header green" v-if="passedItems.length">
        Passed items
      </h2>
      <div class="ui divider"  v-if="passedItems.length"></div>
      <item-details class="items" :icon="'checkmark'" :color="'green'" :items="passedItems" :openCapture="openCapture"
        :actualDir="actualDir" :setImageAsReference="setImageAsReference">
      </item-details>
    </div>

    <capture-modal :src="modalSrc" :bg="modalBgSrc">
    </capture-modal>

    <comparison-modal :src="modalSrc" :srcActual="selectedSrcActual" :srcExpected="selectedSrcExpected" :matching="selectedMatchingResult" :bg="modalBgSrc"></comparison-modal>

    <mask-modal :src="modalSrc" :srcActual="selectedSrcActual" :srcExpected="selectedSrcExpected"
      :matching="selectedMatchingResult" :bg="modalBgSrc" :hasMask="hasMask">
    </mask-modal>

  </div>

</template>

<script>
import CaptureModal from './views/CaptureModal.vue';
import MaskModal from './views/MaskModal.vue';
import ComparisonModal from './views/ComparisonModal.vue';
import ItemSummaries from './views/ItemSummaries.vue';
import ItemDetails from './views/ItemDetails.vue';

const SEARCH_DEBOUNCE_MSEC = 50;
const debounce = require('lodash.debounce');
const path = require('path');
console.log('app.vue WorkerClient.require');
const workerClient = require('./worker-client').default;


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
  data: () => ({
    actualDir   : window['__reg__'].actualDir                    ,
    testId      : window['__reg__'].testId                       ,
    expectedDir : window['__reg__'].expectedDir                  ,
    diffDir     : window['__reg__'].diffDir                      ,
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
  }),
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
  //     ()=> this.openMask('sample.2.should_be_2_but_1_in_before.png', true) // TODO remove
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
      this.selectedSrcExpected = path.join(this.expectedDir || '', src || '');
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
      req.open('POST', 'set-as-reference/'+fileName, true)
      req.send(null)
    },

    filter: debounce(function(search) {
      ['failedItems', 'passedItems', 'newItems', 'deletedItems'].forEach(type => this[type] = searchItems(type, search));
    }, SEARCH_DEBOUNCE_MSEC),
  }
}
</script>

<style scoped src="./styles/common.css"></style>
<style scoped>
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
