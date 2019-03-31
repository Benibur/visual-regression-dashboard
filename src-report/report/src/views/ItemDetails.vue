<template>
    <div>
        <div class="items" v-for="item in items" v-bind:key="item.encoded">
            <a :href="'#' + item.encoded" :id="item.encoded" :class="'ui link ' + color">
                <i :class="'ui icon ' + icon"></i>{{item.raw}}
            </a>
            <div class="captures">

                <div v-if="diffDir" class="capture" v-on:click="openCapture(createSrc(diffDir, item.encoded), createSrc(actualDir, item.encoded))">
                    <capture-image :kind="'Diff'" :src="createSrc(diffDir, item.encoded)" :hasMask="item.hasMask" :file="item.encoded" ></capture-image>
                </div>

                <div v-if="actualDir" class="capture" v-on:click="open(item.encoded, actualDir)">
                    <capture-image :kind="'After'" :src="createSrc(actualDir, item.encoded)" :shouldDisplaySetAsRef="test()"
                      :file="item.encoded" :setImageAsReference="setImageAsReference" :openMask="openMask" :hasMask="item.hasMask" ></capture-image>
                </div>

                <div v-if="expectedDir" class="capture" v-on:click="open(item.encoded, expectedDir)">
                    <capture-image :kind="'Before'" :src="createSrc(expectedDir, item.encoded)" :hasMask="item.hasMask"
                      :file="item.encoded" :canDeleteItem="itemType==='deletedItem'" :deleteItem="deleteItem"></capture-image>
                </div>

            </div>
        </div>
    </div>
</template>

<script>
import CaptureImage from './CaptureImage.vue';
const path = require('path');

export default {
  name: 'ItemDetails',
  components: {
      'capture-image': CaptureImage,
  },
  props: ['items', 'color', 'icon', 'openCapture', 'openComparison', 'diffDir',
  'actualDir', 'expectedDir', 'shouldDisplaySetAsRef', 'setImageAsReference',
  'openMask', 'itemType', 'deleteItem'],
  methods: {
    open: function(src, dir) {
      if (this.openComparison) {
        this.openComparison(src);
      } else {
        this.openCapture(this.createSrc(dir, src));
      }
    },
    createSrc: function(dir, file) {
      return path.join(dir || '', file || '');
    },
    test: function() {
      return !!this.shouldDisplaySetAsRef
    },
  },
}
</script>

<style scoped src="../styles/common.css"></style>
<style scoped>
.capture {
    flex-basis: 30%;
    cursor: pointer;
}

.captures {
    display: flex;
    justify-content: space-between;
    margin: 15px 0 40px;
}
</style>
