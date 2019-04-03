<template>
  <div>
    <modal name="mask" disable-backdrop
      v-on:opened="reInitCanvas(srcActual)" >
      <!-- v-on:before-open="onMaskEvent('before-open')"  -->
      <div class="wrapper" v-on:click.self="closeModal"
        ref="mod" tabindex="1" v-on:keydown.prevent="keyCtrler"
      >

        <div class="maskDrawer">
          <!-- <img :src="srcActual" /> -->
          <canvas id="canvas" width="700" height="400"></canvas>
        </div>
        <div class="menu">
          <!-- <div class="ui buttons">
            <button class="ui button" v-on:click="zoomIn">
              <i class="right zoom in icon"></i>
            </button>
            <button class="ui button" v-on:click="zoomOut">
              <i class="right zoom out icon"></i>
            </button>
            <button class="ui button" v-on:click="deleteSelectedMask">
              Delete selected mask<i class="right trash alternate outline icon"></i>
            </button>
          </div> -->
          <div class="ui buttons">
            <button class="ui button" v-on:click="deleteSelectedMask">
              Delete selected mask!! (Suppr)<i class="right trash alternate outline icon"></i>
            </button>
            <button class="ui button" v-on:click="closeModal">{{cancelLabel}}</button>
            <button class="ui positive button" v-on:click="saveMask">Save</button>
          </div>
        </div>
      </div>
    </modal>
  </div>
</template>

<script>

import {fabric} from 'fabric'
import path     from 'path'

export default {
  name: 'MaskModal',
  props: ['srcActual', 'srcExpected', 'matching', 'hasMask', 'cancelLabel', 'sendMaskToServer', 'getMask' ],
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
      initCanvas(this.srcActual, this.hasMask, this)
    },
    keyCtrler:function (event) {
      console.log(event.key, event.keycode, event.shiftKey)
      if(event.key === 'Delete'){
        this.deleteSelectedMask()
      }else if (event.key === 'Escape') {
        // this.unSelectedMask()
        console.log('discardActiveObject');
        canvasF.discardActiveObject()
        canvasF.requestRenderAll()
      }else if (event.key==='ArrowRight') {
        if (event.shiftKey || event.ctrlKey) {
          modifyWidth(1)
        }else {
          moveX(1)
        }
      }else if (event.key==='ArrowLeft') {
        if (event.shiftKey || event.ctrlKey) {
          modifyWidth(-1)
        }else {
          moveX(-1)
        }
      }else if (event.key==='ArrowDown') {
        if (event.shiftKey || event.ctrlKey) {
          modifyHeight(1)
        }else {
          moveY(1)
        }
      }else if (event.key==='ArrowUp') {
        if (event.shiftKey || event.ctrlKey) {
          modifyHeight(-1)
        }else {
          moveY(-1)
        }
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
    saveMask:function () {
      const filename = path.basename(this.srcActual)
      console.log('saveMask', filename)
      this.sendMaskToServer(filename, getMaskBlob())
      isSaved = true
      this.cancelLabel = 'Close'
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
var canvasF, isSaved
isSaved = true

// const deleteSelectedMask = function () {
//   console.log('deleteSelectedMask');
//   canvasF.remove(canvasF.getActiveObject())
// }

const initCanvas = (url, hasMask, that) => {
  console.log('initCanvas', url);
  console.log('hasMask:', hasMask);
  that.cancelLabel = 'Close'
  // Globals for drag management
  var lastDownInAMask, origX, origY, newRect
  lastDownInAMask = false
  fabric.Object.prototype.transparentCorners = true
  fabric.Object.prototype.cornerStyle = 'circle'
  resizeHtmlCanvas()
  canvasF = new fabric.Canvas('canvas',{
    backgroundColor   : 'rgb(100,100,100)' ,
    selectable        : false              ,
    uniScaleTransform : true               ,
    defaultCursor     : 'crosshair'        ,
  })
  if (hasMask) {
    that.getMask(path.basename(url), canvasF)
  }
  fabric.Image.fromURL(url, (oImg)=>{
    console.log('onload image');
    console.log(oImg)
    oImg.selectable        = false
    oImg.excludeFromExport = true
    oImg.hoverCursor       = 'crosshair'
    canvasF.add(oImg)
    oImg.sendToBack()
  })
  // Track mouse down coordonnates
  canvasF.on('mouse:down', function(o){
    console.log('mouse:down - target', o.target, o.target.type, o.target.type === 'rect');
    if (o.target.type === 'rect') return // test if the click is inside a mask, if yes, exit
    lastDownInAMask = true;
    var pointer = canvasF.getPointer(o.e);
    origX = pointer.x;
    origY = pointer.y;
  });
  // track mouse up to create a mask
  canvasF.on('mouse:up', function(o){
    console.log('mouse:up - lastDownInAMask', lastDownInAMask);
    if (!lastDownInAMask) {
      // canvasF.discardActiveObject()
      canvasF.requestRenderAll()
      return
    } // check the mousedown occured outOf a mask
    lastDownInAMask = false;
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
      transparentCorners : true                ,
      lockRotation       : false               ,
      hoverCursor        : 'grab'              ,
    });
    canvasF.add(newRect).setActiveObject(newRect)
    isSaved = false
    that.cancelLabel = 'Cancel'
  });

  // track if a mask is selected
  // canvasF.on('selection:created', function(o){
  //   console.log('selection:created', canvasF.getActiveObjects().length);
  // })
  // canvasF.on('selection:updated', function(o){
  //   console.log('selection:updated', canvasF.getActiveObjects().length);
  // })
  // canvasF.on('selection:cleared', function(o){
  //   console.log('selection:cleared', canvasF.getActiveObjects().length);
  // })
  canvasF.on('object:moved', function(o){
    console.log('object:moved');
    isSaved = false
    that.cancelLabel = 'Cancel'
  })
  canvasF.on('object:scaled', function(o){
    console.log('object:scaled');
    isSaved = false
    that.cancelLabel = 'Cancel'
  })
  canvasF.on('object:rotated', function(o){
    console.log('object:rotated');
    isSaved = false
    that.cancelLabel = 'Cancel'
  })

}

const resizeHtmlCanvas = function () {
  console.log('resizeHtmlCanvas');
  const can = document.querySelector('canvas#canvas')
  console.log(can);
  can.width = document.documentElement.clientWidth - 80
  can.height = document.documentElement.clientHeight - 100
}

const getMask = function (url) {
  const xhr = new XMLHttpRequest()
  xhr.onreadystatechange = function(event) {
    if (this.readyState === XMLHttpRequest.DONE) {
        if (this.status === 200) {
            // console.log("Réponse de getMask reçue: %s", this.responseText);
            canvasF.loadFromJSON(this.responseText)
        } else {
            console.log("Status de getMask la réponse: %d (%s)", this.status, this.statusText);
        }
    }
  };
  xhr.open('GET', 'mask/'+path.basename(url), true)
  xhr.send(null)
}

const getMaskBlob = function () {
  console.log('getMaskBlob');
  let data = canvasF.toJSON()
  data.objects = data.objects.filter(obj=>(obj.type==='rect' && obj.width>0 && obj.height>0))
  console.log(data);
  const blob = new Blob([JSON.stringify(data, null, 2)], {type : 'application/json'});
  return blob
}

function moveY(Y) {
  canvasF.getActiveObjects().map(obj=>obj.top += Y)
  canvasF.renderAll()
}

function moveX(X) {
  canvasF.getActiveObjects().map(obj=>obj.left += X)
  canvasF.renderAll()
}

function modifyWidth(W) {
  canvasF.getActiveObjects().map(obj=>obj.set('width', obj.width + W))
  canvasF.renderAll()
}

function modifyHeight(H) {
  canvasF.getActiveObjects().map(obj=>obj.set('height', obj.height + H))
  canvasF.renderAll()
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
