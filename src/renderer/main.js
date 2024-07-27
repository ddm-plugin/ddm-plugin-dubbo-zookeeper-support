import Test from './Test.vue';

/* istanbul ignore next */
Test.install = function(Vue) {
  Vue.component(Test.name, Test);
};

export default Test;
