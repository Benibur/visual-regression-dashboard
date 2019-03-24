<template>
  <div>
    <modal name="mask" disable-backdrop
      v-on:opened="reInitCanvas(srcActual)" >
      <!-- v-on:before-open="onMaskEvent('before-open')"  -->
      <div class="wrapper" v-on:click.self="closeModal"
        ref="mod" tabindex="1" v-on:keydown.stop.prevent="keyCtrler"
      >

        <div class="maskDrawer">
          <!-- <img :src="srcActual" /> -->
          <canvas id="canvas" width="700" height="400"></canvas>
        </div>
        <div class="menu">
          <div class="ui buttons">
            <button class="ui button" v-on:click="zoomIn">
              <i class="right zoom in icon"></i>
            </button>
            <button class="ui button" v-on:click="zoomOut">
              <i class="right zoom out icon"></i>
            </button>
            <button class="ui button" v-on:click="deleteSelectedMask">
              Delete selected mask<i class="right trash alternate outline icon"></i>
            </button>
          </div>
          <div class="ui buttons">
            <button class="ui button" v-on:click.self="closeModal">Cancel</button>
            <button class="ui positive button">Save</button>
          </div>
        </div>
      </div>
    </modal>
  </div>
</template>

<script>

import {fabric} from 'fabric'

export default {
  name: 'MaskModal',
  props: ['srcActual', 'srcExpected', 'matching'],
  components: {},
  data: function() {
    return {}
  },
  computed: {
    comparisonProps: function() {
      return {
        srcActual: this.srcActual,
        srcExpected: this.srcExpected,
        matching: this.matching,
      }
    },
  },
  // mounted: function() {
  //   console.log('mask modal mounted');
  // },
  // beforeUpdate: function() {
  //   console.log('mask modal beforeUpdate');
  // },
  // updated: function() {
  //   console.log('mask modal updated');
  //   initFabricCanvas()
  // },
  methods: {
    closeModal: function(event) {
      this.$modal.pop();
    },
    reInitCanvas: function (src) {
      console.log('before initCanvas', src );
      this.$refs.mod.focus()
      initCanvas(this.srcActual)
    },
    keyCtrler:function (event) {
      console.log(event.key), event.keycode;
      if(event.key === 'Delete'){
        this.deleteSelectedMask()
      }
    },
    deleteSelectedMask:function () {
      for (let mask of canvasF.getActiveObjects()) {
        console.log(mask);
        canvasF.remove(mask)
      }
      canvasF.discardActiveObject()
      canvasF.requestRenderAll()
    },
    zoomIn:function () {
      console.log('zoomIn');
      var delta = 20;
      var zoom = canvasF.getZoom();
      zoom = zoom + delta/200;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      console.log('set zoom', zoom);
      canvasF.setZoom(zoom);
      for (let mask of canvasF.getObjects()) {
        console.log(mask);
      }
    },
    zoomOut:function () {

    },
  },
}


/*************************************************************/
/* CANVAS MANAGEMENT                                         */

// Globals
var canvasF

// const deleteSelectedMask = function () {
//   console.log('deleteSelectedMask');
//   canvasF.remove(canvasF.getActiveObject())
// }

const initCanvas = (url) => {
  console.log('initCanvas', url);
  // Globals for drag management
  var lastDownOutOfAMask, origX, origY, newRect
  lastDownOutOfAMask = true
  fabric.Object.prototype.transparentCorners = true
  fabric.Object.prototype.cornerStyle = 'circle'
  // fabric.Object.prototype.uniScaleTransform = true
  resizeHtmlCanvas()
  canvasF = new fabric.Canvas('canvas',{
    backgroundColor: 'rgb(100,100,100)',
    selectable: false,
    uniScaleTransform : true,
  })
  fabric.Image.fromURL(url, (oImg)=>{
    console.log('onload image');
    console.log(oImg)
    oImg.selectable = false
    canvasF.add(oImg)
    oImg.sendToBack()
  })
  var rest1 = new fabric.Rect({
      top    : 100  ,
      left   : 100  ,
      width  : 60   ,
      height : 70   ,
      fill   : 'red',
      selectable:true
  });
  canvasF.add(rest1);

  var rect2 = new fabric.Rect({
      top        : 200    ,
      left       : 100    ,
      width      : 60     ,
      height     : 70     ,
      fill       : 'blue' ,
      selectable : true   ,
  });
  canvasF.add(rect2);

  // Track mouse down coordonnates
  canvasF.on('mouse:down', function(o){
    console.log('mouse:down - target', o.target);
    if (o.target.selectable) return // test if the click is inside a mask, if yes, exit
    lastDownOutOfAMask = true;
    var pointer = canvasF.getPointer(o.e);
    origX = pointer.x;
    origY = pointer.y;
  });

  // track mouse up to create a mask
  canvasF.on('mouse:up', function(o){
    console.log('mouse:up - lastDownOutOfAMask', lastDownOutOfAMask);
    if (!lastDownOutOfAMask) return // check the mousedown occured outOf a mask
    lastDownOutOfAMask = false;
    var pointer = canvasF.getPointer(o.e);
    let width  = pointer.x-origX
    let height = pointer.y-origY
    if (Math.abs(width)<8 && Math.abs(height)<8) return // check the mask is not too small (error)
    console.log('about to create a rect');
    newRect = new fabric.Rect({
      left               : origX               ,
      top                : origY               ,
      width              : width               ,
      height             : height              ,
      fill               : 'rgba(256,0,0,0.5)' ,
      transparentCorners : false               ,
      lockRotation       : false               ,
    });
    canvasF.add(newRect).setActiveObject(newRect)
  });

  // track if a mask is selected
  canvasF.on('selection:created', function(o){
    console.log('selection:created', canvasF.getActiveObjects().length);
  })
  canvasF.on('selection:updated', function(o){
    console.log('selection:updated', canvasF.getActiveObjects().length);
  })
  canvasF.on('selection:cleared', function(o){
    console.log('selection:cleared', canvasF.getActiveObjects().length);
  })

}

const resizeHtmlCanvas = function () {
  console.log('resizeHtmlCanvas');
  const can = document.querySelector('canvas#canvas')
  console.log(can);
  can.width = document.documentElement.clientWidth - 80
  can.height = document.documentElement.clientHeight - 100
}

</script>

<style scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* font-size: 0; */ /* TODO: Why was this needed? */
  padding: 20px 60px;
  height: 100%;
  pointer-events: all;
}

.menu {
  display: inline-block;
  margin-top: 10px;
}
</style>
