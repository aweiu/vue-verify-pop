'use strict';
var verifyBase = require('verify-base');
var pop = require('vue-pop');

// self:当前verifyDirective实例
var verifyErrMsg = require('./verify-err-msg');

verifyBase.errMsg = verifyErrMsg;
var vue = void 0;
var groups = {
  add: function add(uid, name, group) {
    if (!this.hasOwnProperty(uid)) this[uid] = {};
    this[uid][name] = group;
  },
  get: function get(uid, name) {
    if (this[uid]) return this[uid][name];
  },
  remove: function remove(uid, name) {
    if (this[uid]) delete this[uid][name];
  }
};
var verifyResult = {
  result: {
    valid: true,
    results: []
  },
  clear: function clear() {
    this.result.valid = true;
    this.result.results = [];
  },
  add: function add(vRs) {
    if (!vRs.valid) this.result.valid = false;
    this.result.results.push(vRs);
  }
};
var specialInputs = ['checkbox', 'file'];

function specialInput(el, rules) {
  var rs = true;
  var type = el.type;
  switch (type) {
    case 'checkbox':
      if (!el.checked) rs = verifyErrMsg.specialInput.checkbox;
      break;
    default:
      // 用于标志该el为普通input
      rs = false;
  }
  return rs;
}

function verifyFromRules(val, rules) {
  var justVerifyRule = void 0;
  if (!rules['space']) val = val.trim();
  if (val === '') {
    if (rules.minLength === '0' || rules.canBeNull !== undefined) {
      if (rules.verify) justVerifyRule = { verify: rules.verify };else return undefined;
    } else {
      return verifyErrMsg.common.empty;
    }
  }
  for (var rule in justVerifyRule || rules) {
    var verifyFun = void 0;
    if (rule === 'pop' || rule === 'errMsg' || rule === 'noCache' || rule === 'canBeNull' || rule === 'watch') continue;
    if (rule === 'verify') {
      verifyFun = rules[rule];
      if (typeof verifyFun === 'function') {
        var vRs = verifyFun(val);
        // 自定义校验函数返回的错误信息优先级最高
        if (typeof vRs === 'string' || vRs === false) return { err_msg: vRs };
      }
      continue;
    }
    verifyFun = verifyBase(rule);
    if (verifyFun) {
      var _verifyResult = verifyFun(val, rules[rule]);
      if (!_verifyResult.valid) return _verifyResult.err_msg;
    }
  }
}

function verify() {
  var self = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this;
  var el = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : self.el;

  if (!el) return;
  if (self.params.noCache === undefined && self.verifyResult.valid !== 'unknown') return self.verifyResult;
  // 如果是specialInput则会跳过后面普通input的校验
  var rs = specialInput(el, self.params) || verifyFromRules(el.value, self.params);
  // rs===true:当为specialInput的时候会出现这种情况
  var valid = rs === true || rs === undefined;
  if (valid) self._pop.methods.hide();
  return self.verifyResult = {
    el: el,
    valid: valid,
    msg: valid ? '' : rs.err_msg || self.params['errMsg'] || (typeof rs === 'string' ? rs : '该输入框未通过校验')
  };
}

function getPopTip() {
  var self = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this;
  var el = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : self.el;

  if (self._pop) return self._pop;
  var component = function () {
    var pop = document.getElementById(self.params.pop);
    if (pop && pop.tagName === 'POP-EL-WRAP') return pop.__vue__;
    pop = self._host;
    if (pop && pop.$options.name === 'pop') return pop;
    pop = el.parentNode;
    while (pop && pop.tagName !== 'body') {
      if (pop.tagName === 'POP-EL-WRAP') return pop.__vue__;
      pop = pop.parentNode;
    }
  }();
  if (!component) return;
  return self._pop = {
    component: component,
    methods: component.new()
  };
}

var exp = {
  install: function install(Vue) {
    vue = Vue;
    Vue.directive('verify', {
      params: ['pop', 'errMsg', 'noCache', 'canBeNull', 'watch', 'verify', 'length', 'minLength', 'maxNumber', 'minNumber', 'decimalLength', 'int', 'phone', 'idCard', 'bankCard', 'space', 'verifyCode', 'email'],
      paramWatchers: {
        watch: function watch() {
          if (!this._pop) return;
          this.verifyResult.valid = 'unknown';
          this._pop.component.$emit('verify');
        }
      },
      bind: function bind() {
        var _this = this;

        this.vm.$nextTick(function () {
          var pop = getPopTip.call(_this);
          if (!pop) {
            return console.warn({
              el: _this.el,
              err_msg: 'can not find vue-pop,please check'
            });
          }
          _this.verifyResult = { valid: 'unknown' };
          pop.component.$on('verify', function () {
            var vRs = verify.call(_this);
            verifyResult.add(vRs);
            pop.methods.show(vRs.msg);
          });
          pop.component.$on('verifyWithoutErrorTip', function () {
            verifyResult.add(verify.call(_this));
          });
          _this.on('blur', function () {
            pop.component.$emit('verify');
          });
          // 监听输入框value变化
          // 输入框变化清除错误提示
          var clearError = function clearError() {
            if (_this.verifyResult.valid === 'unknown') return;
            if (_this.verifyResult.valid === false) _this._pop.methods.hide();
            _this.verifyResult.valid = 'unknown';
          };
          _this.on(specialInputs.indexOf(_this.el.type) === -1 ? 'input' : 'change', clearError);
          var model = _this.el.__v_model;
          if (model) model.vm.$watch(model.expression, clearError);
          var directives = _this.vm._directives;
          for (var i = 0, l = directives.length; i < l; i++) {
            var directive = directives[i];
            if (directive.el === _this.el && directive.name === 'bind' && directive.arg === 'value') {
              _this.vm.$watch(directive.expression, clearError);
              break;
            }
          }
          _this.el._verify = _this;
        });
      }
    });
    Vue.component('verify', {
      template: '<slot></slot>',
      created: function created() {
        if (!this.name) return console.warn('invalid group name');
        this.__uid = this.$parent._uid;
        if (groups.get(this.__uid, this.name)) return console.warn('the name \'' + this.name + '\' has be used');
        groups.add(this.__uid, this.name, this);
      },
      destroyed: function destroyed() {
        groups.remove(this.__uid, this.name);
      },

      props: ['name']
    });
    Vue.component('pop', pop);
    Vue.prototype.$verify = function (target) {
      var showError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

      var pop = void 0;
      var eType = showError ? 'verify' : 'verifyWithoutErrorTip';
      verifyResult.clear();
      if (typeof target === 'string') {
        if (target.substr(0, 1) === '#') {
          target = document.getElementById(target.substr(1));
          if (target) {
            pop = target._verify._pop.component;
            if (pop) pop.$emit(eType);
          }
        } else {
          var group = groups.get(this._uid, target);
          if (group) {
            group.$broadcast(eType);
          }
        }
      } else if (!target) {
        this.$broadcast(eType);
      } else {
        pop = target._verify._pop.component;
        if (pop) pop.$emit(eType);
      }
      return verifyResult.result;
    };
  },
  addRule: function addRule(name, fun) {
    if (!vue) return console.warn('please install me first');
    if (typeof fun !== 'function') return console.warn('the type of fun must be function');
    var self = vue.directive('verify');
    self.params.push(name);
    verifyBase(name, fun);
  },

  errMsg: verifyErrMsg,
  verifyBase: verifyBase
};
Object.defineProperty(exp, 'errMsg', {
  set: function set(v) {
    verifyErrMsg = v;
    verifyBase.errMsg = v;
  },

  get: function get() {
    return verifyErrMsg;
  }
});
module.exports = exp;