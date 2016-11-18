# vue-verify-pop
自带气泡提示的vue校验插件

## 安装
```
npm install vue-verify-pop
```
## 使用
**VUE版本：1.x** <br>
**必须在vue-cli生成的webpack模板环境中使用**
### 一，在./main.js中执行全局配置
```
import vue from 'vue'
import verify from 'vue-verify-pop'
vue.use(verify)
// 以下配置非必须，按你的需求来
// 配置默认校验不通过时的提示信息
verify.errMsg = YourErroMsg
// 增加校验规则
verify.addRule('myRule', (v) => {return '校验不通过'})
```
### 二，在表单元素中配置校验规则
```
<!--待校验的输入框必须在pop组件内-->
<pop>
  <!--该输入框内容为最多为两位小数的数字-->
  <input v-verify decimal-length="2">
</pop>
```
![image](https://github.com/aweiu/vue-verify-pop/blob/master/example.png)

ok，您已经完成了一个基础校验。气泡提示怎么样？丑的话自己用css改吧。。<br>
*当输入框失去焦点时会自动触发校验，如果校验不通过会出现气泡。再次输入气泡会消失*

## 支持的校验规则(继承verify-base.js)
* length: 校验文本长度
* minLength: 校验文本最短长度
* maxLength: 校验文本最长长度
* maxNumber: 校验数字最大值
* minNumber: 校验数字最小值
* decimalLength: 校验小数位
* number: 校验是否为数字
* int: 校验是否为整数
* phone: 校验是否为手机号
* idCard: 校验是否为身份证号
* bankCard: 校验是否为银行卡号
* email: 校验是否为电子邮件地址
* verifyCode: 校验是否为6位数字验证码
* canBeNull: 当参数为空时跳过校验，不会执行后面的校验规则

## 重要参数说明
**注意：规则中不能有大写字母，用中划线分隔，同vue props属性设置规则**
### errMsg
用于自定义校验不通过提示
```
<pop>
  <input v-verify length="10" err-msg="请输入正确的卡号">
</pop>
```
### maxNumber
注意小于和小于等于的写法
```
<!--该输入框内容必须为小于等于10的数字-->
<pop>
  <input v-verify max-number="10">
</pop>
<!--该输入框内容必须为小于10的数字,通过'!'来标识-->
<pop>
  <input v-verify max-number="!10">
</pop>
```
### minNumber
参考**maxNumber**配置

### pop
用于设置气泡组件的位置。<br>
默认情况下，插件会查找待校验元素的分发对象或父容器(父容器的父容器的父容器...)是否为pop组件，如果找到则使用之。<br>
当待校验元素和气泡提示不再满足父子容器关系时，可以使用该配置
```
<!--当校验不通过时，气泡提示会出现在这个div上面-->
<pop id="cardIdPop">
    <div>我是一个div</div>
</pop>
<input v-verify length="10" err-msg="卡号不正确" pop="cardIdPop">
```
### noCache
用于禁止插件对校验结果的缓存。默认情况下，插件会缓存上次的校验结果，直到待校验元素的值发生变化
```
<pop>
  <input v-verify length="10" err-msg="卡号不正确" no-cache>
</pop>
```
### canBeNull
**插件默认校验输入内容不为空**，该参数一般用于如下情况，比如邀请码这种一般可以为空，不为空又需要校验的输入项
```
<!--当邀请码不为空时才校验长度是否等于10-->
<pop>
  <input v-verify length="10" err-msg="邀请码不正确" can-be-null>
</pop>
```
### watch
监听其他变量，触发自身校验。<br>
一个常见例子:最少参与人数不能大于最多参与人数，当最少参与人数变化时应当触发最多参与人数的校验
```
<template>
  <pop>
    <input placeholder="最少参与人数" v-verify v-model="minNumber" v-verify int>
  </pop>
  <pop>
    <input placeholder="最多参与人数" v-verify v-model="minNumber" v-verify int :verify="verifyMaxNumber" :watch="minNumber">
  </pop>
</template>
<script>
export default{
  data () {
    return {
      minNumber: ''
    }
  },
  methods: {
    verifyMaxNumber (val) {
      if (val - this.minNumber < 0) return '最多参与人数不能小于最少参与人数'
    }
  }
}
</script>
```
## 规则简写
number/int/phone等无须设定值的规则可以直接：
```
<pop>
  <!--该输入框内容必须为手机号-->
  <input v-verify phone>
</pop>
```
maxNumber/minNumber/decimalLength无须写number规则
```
<pop>
  <!--该输入框内容必须为不大于10的数字-->
  <input v-verify max-number="10">
  <!--不用这么写-->
  <input v-verify number max-number="10">
</pop>
```
## 自定义校验方法
如果自带的校验方法满足不了您的需求，可以在校验规则中插入您自己的校验方法
```
<template>
  <pop>
    <!--通过给props.verify赋值来植入自定义校验-->
    <!--当length规则通过时才会执行自定义校验-->
    <input v-verify length="10" :verify="verifyCardId" err-msg="卡号不正确">
  </pop>
</template>
<script>
export default{
  methods: {
    verifyCardId (val) {
      // val: 待校验的值
      // 可以直接return校验不通过的提示
      // if (val.substr(0,1) !== '0') return '卡号不正确'
      // 如果直接return true/false 校验不通过提示将使用errMsg或默认错误提示
      // return val.substr(0,1) === '0'
    }
  }
}
</script>
```
## 自定义校验规则
和自定义校验方法的区别是这个适用于全局，等于增加插件自带的校验规则
```
// 新增校验是否为6位数字 val: 待校验的值 rule: 规则值。
// 校验是否为6位数字这种一般时不需要额外参数用来对比,所以rule参数用不到。校验文本长度，数字大小这种才会用到rule
// <input v-verify length="6"> '6'会作为rule参数
var verifyBase = verify.verifyBase
verify.addRule('number6', (val, rule) => {
	// 判断是否为6位数字
	// 只需要关注错误的情况 返回默认出错提示即可
	if (!verifyBase('number')(val).valid || !verifyBase('length')(val, 6)) return '请输入正确的6位数字'
})
```
调用
```
<!--校验不通过提示优先errMsg,然后才是您自定义规则中返回的默认出错提示-->
<input v-verify number6 err-msg="请输入正确的6位数字验证码">
```
## 手动触发校验&分组校验
```
<template>
  <pop>
    <!--给目标元素设置v-el-->
    <input v-verify length="10" err-msg="卡号1不正确" v-el:ipt>
  </pop>
  <pop>
    <!--给目标元素设置id-->
    <input v-verify length="10" err-msg="卡号2不正确" id="ipt">
  </pop>
  <!--给目标元素设置组名-->
  <verify name="verifyGroup">
    <pop>
      <input v-verify length="10" err-msg="卡号3不正确">
    </pop>
    <pop>
      <input v-verify length="10" err-msg="卡号4不正确">
    </pop>
  </verify>
</template>
<script>
export default{
  ready () {
    // 调用vm对象中$verify方法
    // 无参调用会触发当前vm中所有的待校验元素执行校验并显示校验气泡
    this.$verify()
    // 通过传id参数('#'+id)触发输入框的校验并显示校验气泡
    this.$verify('#ipt')
    // 通过传dom元素触发输入框的校验并显示校验气泡
    this.$verify(this.$els.ipt)
    // 通过传校验组名来校验该组的所有待校验元素
    this.$verify('verifyGroup')
    // 只校验，不显示校验气泡
    this.$verify('verifyGroup', false)
    // 返回：
    {
      // 所有校验结果是否都通过
      valid: true/false,
      results: [
        {
          // 校验的dom元素
          el: DOM,
          // 该元素校验是否通过
          valid: true/false,
          // 错误信息
          msg: ''
        }
      ]
    }
  }
}
</script>
```
## 插件的默认校验不通过提示模版
```
{
  number: {
    common: '请输入数字',
    // >
    maxNumber: '该输入框数字不能大于{maxNumber}',
    // >=
    maxNumber2: '该输入框数字应小于{maxNumber}',
    // <
    minNumber: '该输入框数字不能小于{minNumber}',
    // <=
    minNumber2: '该输入框数字应大于{minNumber}',
    decimalLength: '该输入框最多接受{decimalLength}位小数'
  },
  // 特殊类型
  int: '该输入框仅接受整数',
  phone: '请输入正确的手机号',
  idCard: '请输入正确的身份证号',
  bankCard: '请输入正确的银行卡号',
  email: '请输入正确的邮箱',
  verifyCode: '请输入正确的验证码',
  common: {
    empty: '请补充该项内容',
    length: '请输入{length}位字符',
    minLength: '该输入框内容至少{minLength}位'
  },
  specialInput: {
    checkbox: '请勾选我'
  }
}
```
您可以按照上述格式自定义您的错误提示
```
verify.errMsg = {}
```
也可以只修改某些项
```
verify.errMsg.int = '{mark}必须为整数'
```
## 彩蛋
校验插件不仅能检测到输入内容的变化，绑定值的变化同样在掌控之内，也就是说校验气泡的出现和消失您完全无须手动控制
```
<!--当卡号输入框出校验气泡提示时，cardId值的变化或重新输入卡号，气泡提示都会消失-->
<pop>
  <input v-model="cardId" v-verify length="10" err-msg="卡号不正确">
</pop>
```
