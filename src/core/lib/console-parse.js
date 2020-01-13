/* eslint no-eval: 0 */
/* eslint no-unused-vars: 0 */

window.ExpandedArray = function ExpandedArray() {
  const arr = Array.call(this, 0);
  arr.__proto__ = this.__proto__;
  return arr;
};
window.ExpandedArray.prototype = [];
Object.defineProperty(window.ExpandedArray.prototype, 'constructor', {
  value: window.ExpandedArray,
  enumerable: false
});
window.ExpandedObject = function ExpandedObject() {};
Object.defineProperty(window.ExpandedObject.prototype, 'constructor', {
  value: window.ExpandedObject,
  enumerable: false
});

export default function parse(response) {
  function T(type, hash) {
    if (type === '[object Function]') {
      try {
        return eval('('+hash+')');
      } catch (err) {
        return function() {};
      }
    }
    const matches = type.match(/\[object ([^\]]+)\]/);
    if (!matches) return hash;

    const className = matches[1];
    let Cls = window[className];
    if (!Cls) {
      Cls = Object;
    }
    let instance = Object.create(Cls.prototype);
    try {
      const res = Cls.call(instance);
      if (res) instance = res;
    } catch (err) {}
    for (var i in hash) {
      try {
        Object.defineProperty(instance, i, { value: hash[i] });
      } catch (err) {
      }
    }
    return instance;
  }
  try {
    const evaluated = eval(response);
    return evaluated;
  } catch (err) {
    return response;
  }
};
