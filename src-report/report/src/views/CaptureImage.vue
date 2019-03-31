<template>
  <div class="wrapper">
    <div class="image">
      <div class="ui mini buttons">
        <button class="ui button mini">{{kind}}</button>
        <button v-if="shouldDisplaySetAsRef" class="ui green mini right labeled icon button" v-on:click.stop="()=>setImageAsReference(file)">Validate as new target
          <i class="right download icon"></i>
        </button>
        <button v-if="openMask" class="ui blue mini right labeled icon button" v-on:click.stop="()=>openMask(file, hasMask)">Masks
          <i class="right adjust icon"></i>
        </button>
        <button v-if="canDeleteItem" class="ui blue mini right labeled icon button" v-on:click.stop="()=>deleteItem(file)">Delete
          <i class="right adjust icon"></i>
        </button>
      </div>
      <div>
        <img v-lazy="src" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CaptureImage',
  props: ['kind', 'src', 'shouldDisplaySetAsRef', 'file', 'setImageAsReference', 'openMask', 'hasMask', 'canDeleteItem', 'deleteItem' ],
  // methods:{
  //   setImageAsReference: function() {
  //     console.log('setImageAsReference',this.file);
  //
  //     // request the move of the file in the reference folder
  //     const req = new XMLHttpRequest()
  //     req.onreadystatechange = function(event) {
  //         // XMLHttpRequest.DONE === 4
  //         console.log('onreadystatechange', req.readyState, req.status, req.responseText);
  //         if (req.readyState === XMLHttpRequest.DONE) {
  //             if (req.status === 200) {
  //                 // tests = JSON.parse(req.responseText)
  //                 // tests = JSON.parse(req.responseText)
  //                 // console.log("Réponse reçue: %s");
  //                 console.log(req.responseText);
  //                 console.log(req.response);
  //                 // resultsViewCtrler.init()
  //
  //             } else {
  //                 console.log("Status de la réponse: %d (%s)", req.status, req.statusText)
  //             }
  //         }
  //     };
  //     req.open('POST', 'set-as-reference/'+this.file, true);
  //     req.send(null);
  //   }
  // }
}
</script>

<style scoped>
img {
  max-width: 100%;
  border: solid 1px #f0f0f0;
  border-radius: 2px;
  pointer-events: auto;
}

.image>div {
  position: relative;
}

.header {
  margin-bottom: 5px !important;
  font-weight: normal;
}

.label {
  border-radius: 2px 2px 0 0 !important;
  margin: 0 0 0 2px !important;
  padding: 5px 10px;
}

</style>
