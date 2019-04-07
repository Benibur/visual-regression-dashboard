
import Vue from 'vue';
import VueImageCompare from 'vue-image-compare';
import VueLazyload from 'vue-lazyload';
import VueThinModal from 'vue-thin-modal';
import workerClient from './worker-client';
import App from './App.vue';


/*************************************************************/
/* PREPARE APP                                               */
Vue.use(VueImageCompare);
Vue.use(VueThinModal);
Vue.use(VueLazyload, {
  preLoad: 1.3,
  loading: 'https://github.com/reg-viz/reg-cli/blob/master/docs/image.png?raw=true',
  error: 'https://github.com/reg-viz/reg-cli/blob/master/docs/image.png?raw=true',
  filter: {
    filter(props) {},
  },
});


/*************************************************************/
/* GET the report data                                       */
const xhr = new XMLHttpRequest()
const path = window.location.pathname.split('/')
xhr.onreadystatechange = function (event) {
  if (this.readyState === XMLHttpRequest.DONE) {
    if (this.status === 200) {

      window['__reg__'] = JSON.parse(this.responseText)

      new Vue({
        el: '#app',
        render: h => h(App),
      });

      const ximgdiffConfig = window['__reg__'].ximgdiffConfig || { enabled: false };
      workerClient.start(ximgdiffConfig);

    } else {
      console.log("Status de get report data :", this.status, this.statusText);
    }
  }
};
xhr.open('GET', `/api/${path[2]}/${path[3]}/${path[4]}/data`, true)
xhr.send(null)
