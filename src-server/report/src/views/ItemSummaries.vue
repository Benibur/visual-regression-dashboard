<template>
  <div class="menu" v-if="items.length">
    <a :href="'#' + item.encoded" :class="'ui item link ' + color" v-for="item in items" v-bind:key="item.encoded">
        <i :class="'ui icon ' + icon + ' ' + color"></i>{{item.raw}}
    </a>
  </div>
</template>

<script>

export default {
    name: 'ItemSummaries',
    props: ['color', 'title', 'items', 'icon'],
    data: () => ({
        showSummary:true,
    }),
    created:function () {
      this.showSummary = this.title === 'Changed items'
    },
}
</script>

<style scoped src="../styles/common.css"></style>
<style scoped>
.summary {
    margin: 5px 20px 20px;
}
.link {
    display: block;
}
</style>
