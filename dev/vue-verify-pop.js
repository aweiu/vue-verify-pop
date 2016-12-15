/**
 * Created by awei on 2016/6/17.
 */
// self:当前verifyDirective实例
var verifyErrMsg = require('./verify-err-msg')
import verifyBase from 'verify-base'
import pop from 'vue-pop'
verifyBase.errMsg = verifyErrMsg;
var vue
var groups = {
  add (uid, name, group) {
    if (!this.hasOwnProperty(uid)) this[uid] = {}
    this[uid][name] = group
  },
  get (uid, name) {
    if (this[uid]) return this[uid][name]
  }
}
var verifyResult = {
  result: {
    valid: true,
    results: []
  },
  clear () {
    this.result.valid = true
    this.result.results = []
  },
  add (vRs) {
    if (!vRs.valid) this.result.valid = false
    this.result.results.push(vRs)
  }
}
var specialInputs = ['checkbox', 'file']
function specialInput (el, rules) {
  var type = el.type
  var rs = true
  switch (type) {
    case 'checkbox':
      if (!el.checked) rs = verifyErrMsg.specialInput.checkbox
      break
    default:
      // 用于标志该el为普通input
      rs = false
  }
  return rs
}
function verifyFromRules (val, rules) {
  if (!rules['space']) val = val.trim()
  if (val === '') {
    if (rules.minLength === '0' || rules.canBeNull !== undefined) {
      if (rules.verify) var justVerifyRule = {verify: rules.verify}
      else return undefined
    } else {
      return verifyErrMsg.common.empty
    }
  }
  for (let rule in justVerifyRule || rules) {
    if (rule === 'pop' || rule === 'errMsg' || rule === 'noCache' || rule === 'canBeNull' || rule === 'watch') continue
    if (rule === 'verify') {
      var verifyFun = rules[rule]
      if (typeof verifyFun === 'function') {
        let vRs = verifyFun(val)
        // 自定义校验函数返回的错误信息优先级最高
        if (typeof vRs === 'string' || vRs === false) return {err_msg: vRs}
      }
      continue
    }
    verifyFun = verifyBase(rule)
    if (verifyFun) {
      var verifyResult = verifyFun(val, rules[rule])
      if (!verifyResult.valid) return verifyResult.err_msg
    }
  }
}
function verify (self = this, el = self.el) {
  if (!el) return
  if (self.params.noCache === undefined && self.verifyResult.valid !== 'unknown') return self.verifyResult
  // 如果是specialInput则会跳过后面普通input的校验
  var rs = specialInput(el, self.params) || verifyFromRules(el.value, self.params)
  // rs===true:当为specialInput的时候会出现这种情况
  var valid = (rs === true || rs === undefined)
  if (valid) self._pop.methods.hide()
  return (self.verifyResult = {
    el: el,
    valid: valid,
    msg: valid ? '' : (rs.err_msg || self.params['errMsg'] || (typeof rs === 'string' ? rs : '该输入框未通过校验'))
  })
}

function getPopTip (self = this, el = self.el) {
  if (self._pop) return self._pop
  var component = (function () {
    var pop = document.getElementById(self.params.pop)
    if (pop && pop.tagName === 'POP-EL-WRAP') return pop.__vue__
    pop = self._host
    if (pop && pop.$options.name === 'pop') return pop
    pop = el.parentNode
    while (pop && pop.tagName !== 'body') {
      if (pop.tagName === 'POP-EL-WRAP') return pop.__vue__
      pop = pop.parentNode
    }
  })()
  if (!component) return
  return (self._pop = {
    component: component,
    methods: component.new()
  })
}
var exp = {
  install (Vue) {
    vue = Vue
    Vue.directive('verify', {
      params: [
        'pop',
        'errMsg',
        'noCache',
        'canBeNull',
        'watch',
        'verify',
        'length',
        'minLength',
        'maxNumber',
        'minNumber',
        'decimalLength',
        'int',
        'phone',
        'idCard',
        'bankCard',
        'space',
        'verifyCode',
        'email'
      ],
      paramWatchers: {
        watch () {
          this.verifyResult.valid = 'unknown'
          this._pop.component.$emit('verify')
        }
      },
      bind () {
        this.vm.$nextTick(() => {
          var pop = getPopTip.call(this)
          if (!pop) {
            return console.warn({
              el: this.el,
              err_msg: 'can not find vue-pop,please check'
            })
          }
          this.verifyResult = {valid: 'unknown'}
          pop.component.$on('verify', () => {
            var vRs = verify.call(this)
            verifyResult.add(vRs)
            pop.methods.show(vRs.msg)
          })
          pop.component.$on('verifyWithoutErrorTip', () => {
            verifyResult.add(verify.call(this))
          })
          this.on('blur', () => {
            pop.component.$emit('verify')
          })
          // 监听输入框value变化
          // 输入框变化清除错误提示
          var clearError = () => {
            if (this.verifyResult.valid === 'unknown') return
            if (this.verifyResult.valid === false) this._pop.methods.hide()
            this.verifyResult.valid = 'unknown'
          }
          this.on(specialInputs.indexOf(this.el.type) === -1 ? 'input' : 'change', clearError)
          var model = this.el.__v_model
          if (model) model.vm.$watch(model.expression, clearError)
          var directives = this.vm._directives
          for (var i = 0, l = directives.length; i < l; i++) {
            var directive = directives[i]
            if (directive.el === this.el && directive.name === 'bind' && directive.arg === 'value') {
              this.vm.$watch(directive.expression, clearError)
              break
            }
          }
          this.el._verify = this
        })
      }
    })
    Vue.component('verify', {
      template: '<slot></slot>',
      created () {
        if (!this.name) return console.warn('invalid group name')
        var uid = this.$parent._uid
        if (groups.get(uid, this.name)) return console.warn(`the name '${this.name}' has be used`)
        groups.add(uid, this.name, this)
      },
      props: ['name']
    })
    Vue.component('pop', pop)
    Vue.prototype.$verify = function (target, showError = true) {
      verifyResult.clear()
      var eType = showError ? 'verify' : 'verifyWithoutErrorTip'
      if (typeof target === 'string') {
        if (target.substr(0, 1) === '#') {
          target = document.getElementById(target.substr(1))
          if (target) {
            var pop = target._verify._pop.component
            if (pop)pop.$emit(eType)
          }
        } else {
          var group = groups.get(this._uid, target)
          if (group) {
            group.$broadcast(eType)
          }
        }
      } else if (!target) {
        this.$broadcast(eType)
      } else {
        pop = target._verify._pop.component
        if (pop)pop.$emit(eType)
      }
      return verifyResult.result
    }
  },
  addRule (name, fun) {
    if (!vue) return console.warn('please install me first')
    if (typeof fun !== 'function') return console.warn('the type of fun must be function')
    var self = vue.directive('verify')
    self.params.push(name)
    verifyBase(name, fun)
  },
  errMsg: verifyErrMsg,
  verifyBase: verifyBase
}
Object.defineProperty(exp, "errMsg", {
  set(v) {
    verifyErrMsg = v;
    verifyBase.errMsg = v;
  },
  get: () => verifyErrMsg
});
export default exp
