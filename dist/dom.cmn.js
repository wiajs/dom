/*!
  * wia dom v1.0.10
  * (c) 2015-2023 Sibyl Yu and contributors
  * Released under the MIT License.
  */
'use strict';

/*
 * Expand $.fn
 * 扩展 $.fn
 * same syntax as well known jQuery library
 */

const emptyArray = [];
const elementDisplay = {};
const rootNodeRE = /^(?:body|html)$/i;
const propMap = {
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  for: 'htmlFor',
  class: 'className',
  maxlength: 'maxLength',
  cellspacing: 'cellSpacing',
  cellpadding: 'cellPadding',
  rowspan: 'rowSpan',
  colspan: 'colSpan',
  usemap: 'useMap',
  frameborder: 'frameBorder',
  contenteditable: 'contentEditable',
};

// 返回数组
function concat(...arg) {
  const args = [];
  for (let i = 0; i < arg.length; i++) {
    const v = arg[i];
    args[i] = $.isDom(v) ? v.toArray() : v;
  }
  return emptyArray.concat.apply($.isDom(this) ? this.toArray() : this, args);
}

function ready(cb) {
  if (/complete|loaded|interactive/.test(document.readyState) && document.body) cb($);
  else
    document.addEventListener(
      'DOMContentLoaded',
      function () {
        cb($);
      },
      false
    );
  return this;
}

// 转为节点数组，或指定索引节点
function get(idx) {
  return idx === undefined ? emptyArray.slice.call(this) : this[idx >= 0 ? idx : idx + this.length];
}

function toArray() {
  return this.get();
}

function size() {
  return this.length;
}

/**
 * 删除或设置dom属性
 * @param {*} node
 * @param {*} n attr name
 * @param {*} value null or undefined
 */
function setAttr(node, n, value) {
  if (node && node.nodeType === 1) {
    if (value == null) node.removeAttribute(n);
    else node.setAttribute(n, value);
  }
}

function attr(n, value) {
  let R;
  const el = this[0];

  // Get attr
  if (arguments.length === 1 && typeof n === 'string') {
    if (el.nodeType === 1 && el) R = el.getAttribute(n);
  } else {
    // Set attr
    R = this.each(function (idx) {
      if ($.isObject(n)) {
        Object.keys(n).forEach(k => {
          this[k] = n[k]; // f7
          setAttr(this, k, n[k]);
        });
      } else setAttr(this, n, $.funcArg(this, value, idx, this.getAttribute(n)));
    });
  }

  return R;
}

function removeAttr(n) {
  return this.each(function () {
    this.nodeType === 1 &&
      n.split(' ').forEach(function (v) {
        setAttr(this, v);
      }, this);
  });
}

function hasAttr(n) {
  return emptyArray.some.call(this, function (el) {
    return el.hasAttribute(n);
  });
}

function prop(n, value) {
  try {
    n = propMap[n] || n;
    // Get prop
    if (arguments.length === 1 && typeof n === 'string') this[0] && this[0][n];
    else {
      // Set props
      return this.each(function (idx) {
        if (arguments.length === 2) this[n] = $.funcArg(this, value, idx, this[n]);
        else if ($.isObject(n)) {
          // eslint-disable-next-line
          for (const prop in n) {
            this[prop] = n[prop];
          }
        }
      });
    }
  } catch (ex) {
    console.log('prop exp:', ex.message);
  }
}

function removeProp(n) {
  n = propMap[n] || n;
  return this.each(function () {
    delete this[n];
  });
}

// 读取或设置 data-* 属性值，保持与jQuery 兼容
// 在dom节点上自定义 domElementDataStorage 对象存储数据
function data(key, value) {
  let R;
  let el;
  const attrName = 'data-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();

  if (typeof value === 'undefined') {
    el = this[0];
    // Get value
    if (el) {
      if (el.domElementDataStorage && key in el.domElementDataStorage) {
        R = el.domElementDataStorage[key];
      } else R = this.attr(attrName);
    }
    if (R) R = $.deserializeValue(R);
  } else {
    // Set value
    for (let i = 0; i < this.length; i += 1) {
      el = this[i];
      if (!el.domElementDataStorage) el.domElementDataStorage = {};
      el.domElementDataStorage[key] = value;
      this.attr(attrName, value);
    }
    R = this;
  }

  return R;
}

function removeData(key) {
  const attrName = 'data-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();

  for (let i = 0; i < this.length; i += 1) {
    const el = this[i];
    if (el.domElementDataStorage && el.domElementDataStorage[key]) {
      el.domElementDataStorage[key] = null;
      delete el.domElementDataStorage[key];
    }
    el.removeAttribute(attrName);
  }

  return this;
}

function dataset() {
  const el = this[0];
  if (!el) return undefined;

  const dataset = {}; // eslint-disable-line
  if (el.dataset) {
    // eslint-disable-next-line
    for (const dataKey in el.dataset) {
      dataset[dataKey] = el.dataset[dataKey];
    }
  } else {
    for (let i = 0; i < el.attributes.length; i += 1) {
      // eslint-disable-next-line
      const attr = el.attributes[i];
      if (attr.name.indexOf('data-') >= 0) {
        dataset[$.camelCase(attr.name.split('data-')[1])] = attr.value;
      }
    }
  }

  // eslint-disable-next-line
  for (const key in dataset) dataset[key] = $.deserializeValue(dataset[key]);

  return dataset;
}

/**
 * 表单节点值的获取、设置
 * 获取时，只获取第一个dom对象value
 * 设置时，对节点数组同时设置
 * 支持 select单选、多选，checkbox，radio
 * @param {*} value 值
 * value 为Dom对象时，表示节点容器，带容器参数时，支持容器内radio、checkbox有效值获取
 * @param {*} el 节点容器，带容器参数时，支持容器内radio、checkbox赋值
 * @returns
 */
function val(value, el) {
  let R;
  // 设置值
  if (0 in arguments && !$.isDom(value)) {
    if (value == null) value = '';
    return this.each(function (idx) {
      let vs = $.funcArg(this, value, idx, this.value);
      const dom = this;

      // 注意，节点value是字符串！
      // select 多选，单选直接赋值即可
      if (dom.multiple && dom.nodeName.toLowerCase() === 'select') {
        if (Array.isArray(vs)) vs = vs.map(v => v.toString());
        else vs = [vs.toString()];
        dom.options.forEach(o => (o.selected = vs.includes(o.value)));
      } else if (dom.type === 'checkbox' && el) {
        if (Array.isArray(vs)) vs = vs.map(v => v.toString());
        else vs = [vs.toString()];

        const name = $(dom).attr('name');
        const ns = $(`input[name=${name}]`, el);
        ns.forEach(n => (n.checked = vs.includes(n.value)));
      } else if (dom.type === 'radio' && el) {
        if (Array.isArray(vs)) vs = vs[0];

        const name = $(dom).attr('name');
        const ns = $(`input[name=${name}]`, el);
        ns.forEach(n => {
          n.checked = n.value === vs.toString();
        });
      } else dom.value = vs.toString();
    });
  } else if (this[0]) {
    // 获取值
    const dom = this[0];
    R = dom.value;
    // 多选
    if (dom.multiple && dom.nodeName.toLowerCase() === 'select')
      R = $(dom)
        .find('option')
        .filter(function () {
          return this.selected;
        })
        .pluck('value');
    else if (dom.type === 'checkbox' && $.isDom(value)) {
      const el = value;
      const name = this.attr('name');
      const ns = $(`input[name=${name}]:checked`, el);
      R = ns.pluck('value');
    } else if (dom.type === 'radio' && $.isDom(value)) {
      const el = value;
      const name = this.attr('name');
      const n = $(`input[name=${name}]:checked`, el);
      if (n && n.length) R = n[0].value;
    }
  }

  return R;
}

// Transforms
// eslint-disable-next-line
function transform(transform) {
  for (let i = 0; i < this.length; i += 1) {
    const elStyle = this[i].style;
    elStyle.webkitTransform = transform;
    elStyle.transform = transform;
  }
  return this;
}
function transition(duration) {
  if (typeof duration !== 'string') {
    duration = `${duration}ms`; // eslint-disable-line
  }
  for (let i = 0; i < this.length; i += 1) {
    const elStyle = this[i].style;
    elStyle.webkitTransitionDuration = duration;
    elStyle.transitionDuration = duration;
  }
  return this;
}

/**
 * 事件侦听
 * 匿名/有名函数 统统封装为有名函数，存储在当前元素属性中，方便off
 * 第一个参数为event，
 * 第二个参数为this，解决类事件函数this绑定到对象无法获得事件this问题。
 * targetSelector 目标选择器，常用于容器中的click、change事件，
 *   根据触发源target动态向上查找指定元素
 * 事件响应，dom事件中的 event作为第一个参数，其他为扩展参数
 * trigger触发时，可带扩展参数，扩展参数通过el的 wiaDomEventData 传递
 * 触摸屏，click 300ms 有延迟，改用 touch 实现立即触发
 * 避免click穿透，touch触发click事件后，禁止300ms后的click事件
 * swipe 滑动事件上下左右四个方向，滑动距离超过10px，则触发回调函数
 *   触发回调函数，参数为 (ev, {x, y})，x y互斥，只有一个有值
 * press 按压事件，超过 1秒，移动距离小于 5px，为 press 事件
 */
function on(...args) {
  let [eventType, targetSelector, listener, capture] = args;

  if (typeof args[1] === 'function') {
    [eventType, listener, capture] = args;
    targetSelector = undefined;
  }

  // 封装需动态查找目标元素的事件回调函数
  function liveHandler(ev, sender, ...vs) {
    const n = ev.target; // 事件源，不能用this
    if (!n) return;

    const {eventType: evType, selector, liveProxy: fn} = liveHandler;

    // 向上查找符合选择器元素，找到一个即触发，其他符合选择器不触发
    // f7是查找所有符合选择器父元素，全部触发，实际使用中，只需最近的元素触发，无需全部触发！
    const el = $(n).closest(selector)?.dom; // live事件函数，目标选择器对象，替换真正的this
    // console.log('liveHandler ', {listener: this, selector, event: ev, target: n, upper: $n?.dom});
    // debugger;
    if (el && (evType !== 'click' || canClick(el, fn))) {
      const param = [ev, el, ...vs]; // 符合元素作为事件函数第二个参数
      fn.apply(el, param); // this、sender 指向符合选择器元素
    }
  }

  // 带有目标选择器，回调函数转换为 liveHandler
  if (targetSelector) {
    liveHandler.selector = targetSelector;
    liveHandler.liveProxy = listener;
    liveHandler.eventType = eventType;
    return this.on(eventType, liveHandler, capture);
  }

  if (!capture) capture = false;

  // 事件响应，dom事件中的 event作为第一个参数
  // trigger通过el的 wiaDomEventData 带额外参数，
  function handleEvent(ev, ...vs) {
    const ds = ev?.target?.wiaDomEventData ?? [];
    const param = [ev, this, ...vs, ...ds];

    // console.log('handleEvent ', {listener: this, event: ev, target: ev?.target});
    listener.apply(this, param);
  }

  /**
   * 同一节点、同一事件函数，过500毫秒才能重复触发click事件，避免连击时连续触发同一函数
   * @param {*} el 元素节点
   * @param {*} fn 事件函数
   * @returns
   */
  function canClick(el, fn) {
    let R = true;

    if (!el || !fn) return false;

    // 排除live、once封装代理函数，排除 document等非元素节点，主要针对 button、link、div
    if (fn.liveProxy || fn.onceProxy || el.nodeType !== 1) return true;

    try {
      // disabled not trigger event
      if (el.clickDisabled?.has?.(fn)) {
        // ev.stopPropagation(); // 阻止事件冒泡，会阻止live和对同一节点的多侦听事件
        console.log('duplicate click disabled.');
        R = false;
      } else {
        // 阻止连击  Prevent duplicate clicks
        if (!el.clickDisabled) el.clickDisabled = new Set();
        el.clickDisabled.add(fn);
        setTimeout(() => el.clickDisabled.delete(fn), 200); // wait 500 ms, can click again
      }
    } catch (ex) {
      console.log('canClick exp:', ex.message);
    }

    return R;
  }

  // Prevent duplicate clicks
  // click事件响应，dom事件中的 event作为第一个参数，其他为扩展参数
  function clickEvent(ev) {
    // console.log('clickEvent ', {listener: this, event: ev, target: ev?.target});
    const el = this;

    if (!canClick(el, listener)) return false;

    const ds = ev?.target?.wiaDomEventData || [];
    const param = [ev, this, ...ds];
    listener.apply(this, param);
  }

  // on 函数内共享闭包变量
  const touch = {};
  function touchStart(ev) {
    // console.log('touchStart');

    // ev.preventDefault(); // 默认行为为滚动屏幕，调用则禁止屏幕滚动，比如屏幕上画画，就需要禁止屏幕滚动
    // touch.x = e.targetTouches[0].pageX; // pageX 相对文档的位置
    touch.x = ev.targetTouches[0].pageX; // targetTouches clientX 可见视口位置，pageX 文档位置
    touch.y = ev.targetTouches[0].pageY;
    touch.el = $(ev.target);
    touch.top = touch.el.rect()?.top ?? 0;
    touch.left = touch.el.rect()?.left ?? 0;
    touch.time = new Date().getTime();
    touch.trigger = false;
    touch.scrollY = false;
    const pg = touch.el.closest('.page-content').dom;
    if (pg) {
      touch.scrollY = true;
      if (pg.scrollTop === 0 || pg.scrollTop + pg.clientHeight === pg.scrollHeight)
        touch.scrollY = false;
    }
  }

  // swipe 滑动事件
  function touchMove(ev) {
    // console.log('touchMove');
    if (eventType !== 'swipe' || touch.trigger) return;

    const x = Math.round(ev.targetTouches[0].pageX - touch.x);
    const y = Math.round(ev.targetTouches[0].pageY - touch.y);
    const top = Math.round((touch.el.rect()?.top ?? 0) - touch.top);
    const left = Math.round((touch.el.rect()?.left ?? 0) - touch.left);

    // 计算手指在屏幕上的滑动距离，减掉页面跟随手指滚动的距离
    const mx = Math.abs(x - left);
    const my = Math.abs(y - top);

    // 页面不滚动，滑动超过12px，触发滑动事件，页面滚动则不触发
    if (my > 15 && mx < 8 && top === 0 && !touch.scrollY) {
      // e.preventDefault(); // 滑动不会产生onclick事件！ 不阻止后续的 onclick 事件，否则后续onclick 不会触发
      touch.trigger = true; // move 会反复触发，事件只触发一次
      return handleEvent.call(this, ev, {x: 0, y});
    }

    if (mx > 12 && my < 8 && left === 0 && top === 0) {
      // e.preventDefault(); // 滑动不会产生onclick事件！ 不阻止后续的 onclick 事件，否则后续onclick 不会触发
      touch.trigger = true; // move 会反复触发，事件只触发一次
      return handleEvent.call(this, ev, {x, y: 0});
    }
  }

  // 同时具备 press click，需分开两个函数侦听，触发两次，否则只能触发一次
  function clickEnd(ev) {
    return touchEnd.call(this, ev);
  }

  function pressEnd(ev) {
    return touchEnd.call(this, ev);
  }

  // touch click 和 press 事件，与onclick事件需二选一，使用 touch click，不会抑制后续的onclick事件。
  // 如果上层有click事件，客户端需调用e.preventDefault()来阻止穿透。
  function touchEnd(ev) {
    // console.log('touchEnd', {eventType});
    if (eventType !== 'click' && eventType !== 'press') return;
    touch.trigger = false;
    const x = Math.abs(ev.changedTouches[0].pageX - touch.x);
    const y = Math.abs(ev.changedTouches[0].pageY - touch.y);
    const tm = new Date().getTime() - touch.time;
    // console.log('touchEnd', {x, y, tm});
    if (x <= 5 && y <= 5) {
      // 由于在层中使用click，禁止缺省行为后，层中的输入框、下拉框等均失效
      // 阻止后续的 onclick 事件，可在按钮中实现，否则页面变动后，后续onclick 事件会触发在其他节点上，导致点击穿透错误！
      // ev.preventDefault();
      if (tm < 500 && eventType === 'click') return clickEvent.call(this, ev);
      if (tm > 500 && eventType === 'press') return handleEvent.call(this, ev);
    }
  }

  const events = eventType.split(' ');
  let j;
  for (let i = 0; i < this.length; i += 1) {
    const el = this[i];
    // 未设置目标选择器
    for (j = 0; j < events.length; j += 1) {
      const event = events[j];
      // 每个事件的每个函数，都保存到el属性中，方便off
      if (!el.domListeners) el.domListeners = {};
      // 事件对应的函数数组，每个函数都要 addEventListener，才能接收事件回调
      if (!el.domListeners[event]) el.domListeners[event] = [];

      // 触摸屏，touch 代替 click，proxyListener 事件处理代理，domListeners 保存在el上
      if ($.support.touch && (event === 'click' || event === 'swipe' || event === 'press')) {
        const lis = {
          capture,
          listener,
          proxyListener: [touchStart],
        };

        let passive = capture;
        if (event === 'swipe') {
          if ($.support.passiveListener) passive = {passive: true, capture};
          lis.proxyListener.push(touchMove);
        } else if (event === 'click') lis.proxyListener.push(clickEnd);
        else if (event === 'press') lis.proxyListener.push(pressEnd);

        el.domListeners[event].push(lis);
        lis.proxyListener.forEach(fn => {
          let type = '';
          // fn.name 会被优化，不可使用
          switch (fn) {
            case touchStart:
              type = 'touchstart';
              break;
            case touchMove:
              type = 'touchmove';
              break;
            case clickEnd:
              type = 'touchend';
              break;
            case pressEnd:
              type = 'touchend';
              break;
          }
          // console.log('touch', {type, fn: fn.name, passive});
          el.addEventListener(type, fn, passive);
        });
      } else if (event === 'click') {
        el.domListeners[event].push({
          capture,
          listener,
          proxyListener: clickEvent,
        });
        el.addEventListener(event, clickEvent, capture);
      } else {
        // 其他事件
        el.domListeners[event].push({
          capture,
          listener,
          proxyListener: handleEvent,
        });
        el.addEventListener(event, handleEvent, capture);
      }
    }
  }

  return this;
}

/**
 * 解除事件侦听
 * @param  {...any} args
 * @param  {String} event 事件，必选
 * listener 侦听函数，不传，则解除所有侦听
 * capture：不传默认为false，如果on时为true，off时需传true
 * targetSelector：多余参数，兼容f7
 * @returns
 */
function off(...args) {
  let [eventType, targetSelector, listener, capture] = args;
  if (typeof args[1] === 'function') {
    [eventType, listener, capture] = args;
    targetSelector = undefined;
  }
  if (!capture) capture = false;

  const events = eventType.split(' ');
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    for (let j = 0; j < this.length; j += 1) {
      const el = this[j];
      // 事件对应的所有处理对象
      const handlers = el?.domListeners?.[event];
      if (handlers?.length) {
        for (let k = handlers.length - 1; k >= 0; k -= 1) {
          const handler = handlers[k]; // 事件响应对象数组
          // 匹配函数，通过封装函数解除侦听，匿名函数无法解除
          if (handler?.listener === listener && handler?.capture === capture) {
            // 解除额外添加的侦听
            if ((event === 'click' || event === 'swipe' || event === 'press') && $.support.touch) {
              el.removeEventListener('touchstart', handler.proxyListener[0], handler.capture);

              if (event === 'swipe')
                el.removeEventListener('touchmove', handler.proxyListener[1], handler.capture);
              else el.removeEventListener('touchend', handler.proxyListener[1], handler.capture);
            } else el.removeEventListener(event, handler.proxyListener, handler.capture);
            handlers.splice(k, 1);
          } else if (
            listener &&
            handler?.listener?.onceProxy === listener &&
            handler?.capture === capture
          ) {
            // once 一次性事件
            el.removeEventListener(event, handler.proxyListener, handler.capture);
            handlers.splice(k, 1);
          } else if (
            listener &&
            targetSelector &&
            handler?.listener?.liveProxy === listener &&
            handler?.listener?.selector === targetSelector &&
            handler?.capture === capture
          ) {
            // 指定事件目标选择器 live 封装，一个函数可对应 多个不同事件目标选择器
            el.removeEventListener(event, handler.proxyListener, handler.capture);
            handlers.splice(k, 1);
          } else if (
            listener &&
            !targetSelector &&
            handler?.listener?.liveProxy === listener &&
            handler?.capture === capture
          ) {
            // 不指定事件目标选择器，该事件 所有 live对应的相同函数 均解除
            el.removeEventListener(event, handler.proxyListener, handler.capture);
            handlers.splice(k, 1);
          } else if (!listener) {
            // 不指定函数，则解除该元素所有侦听函数
            el.removeEventListener(event, handler.proxyListener, handler.capture);
            handlers.splice(k, 1);
          }
        }
      }
    }
  }
  return this;
}

function once(...args) {
  const self = this;
  let [eventName, targetSelector, listener, capture] = args;
  if (typeof args[1] === 'function') {
    [eventName, listener, capture] = args;
    targetSelector = undefined;
  }
  // 封装 回调函数，执行一次后自动 off
  function onceHandler(...eventArgs) {
    self.off(eventName, targetSelector, onceHandler, capture);
    if (onceHandler.onceProxy) {
      onceHandler.onceProxy.apply(this, eventArgs);
      delete onceHandler.onceProxy;
    }
  }
  onceHandler.onceProxy = listener;
  return self.on(eventName, targetSelector, onceHandler, capture);
}

/**
 * 触发事件函数
 * 第一个数据参数放入回调函数第一个参数event事件的 detail 属性中！
 * 扩展参数放入el的wiaDomEventData属性传递，触发时带入事件回调函数参数中！
 * @param  {...any} args
 * @returns
 */
function trigger(...args) {
  const events = args[0].split(' ');
  const eventData = args[1];
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    for (let j = 0; j < this.length; j += 1) {
      const el = this[j];
      let evt;
      try {
        evt = new window.CustomEvent(event, {
          detail: eventData,
          bubbles: true,
          cancelable: true,
        });
      } catch (e) {
        evt = document.createEvent('Event');
        evt.initEvent(event, true, true);
        evt.detail = eventData;
      }
      // eslint-disable-next-line
      el.wiaDomEventData = args.filter((data, dataIndex) => dataIndex > 0);
      el.dispatchEvent(evt); // el === event.target
      el.wiaDomEventData = [];
      delete el.wiaDomEventData;
    }
  }
  return this;
}

function transitionEnd(callback) {
  const events = ['webkitTransitionEnd', 'transitionend'];
  const dom = this;
  let i;
  function fireCallBack(e) {
    /* jshint validthis:true */
    if (e.target !== this) return;
    callback.call(this, e);
    for (i = 0; i < events.length; i += 1) {
      dom.off(events[i], fireCallBack);
    }
  }
  if (callback) {
    for (i = 0; i < events.length; i += 1) {
      dom.on(events[i], fireCallBack);
    }
  }
  return this;
}

function animationEnd(callback) {
  const events = ['webkitAnimationEnd', 'animationend'];
  const dom = this;
  let i;
  function fireCallBack(e) {
    if (e.target !== this) return;
    callback.call(this, e);
    for (i = 0; i < events.length; i += 1) {
      dom.off(events[i], fireCallBack);
    }
  }
  if (callback) {
    for (i = 0; i < events.length; i += 1) {
      dom.on(events[i], fireCallBack);
    }
  }
  return this;
}

// Sizing/Styles
function width() {
  if (this[0] === window) {
    return window.innerWidth;
  }

  if (this.length > 0) {
    return parseFloat(this.css('width'));
  }

  return null;
}
function outerWidth(includeMargins) {
  if (this.length > 0) {
    if (includeMargins) {
      // eslint-disable-next-line
      const styles = this.styles();
      return (
        this[0].offsetWidth +
        parseFloat(styles.getPropertyValue('margin-right')) +
        parseFloat(styles.getPropertyValue('margin-left'))
      );
    }
    return this[0].offsetWidth;
  }
  return null;
}
function height() {
  if (this[0] === window) {
    return window.innerHeight;
  }

  if (this.length > 0) {
    return parseFloat(this.css('height'));
  }

  return null;
}
function outerHeight(includeMargins) {
  if (this.length > 0) {
    if (includeMargins) {
      // eslint-disable-next-line
      const styles = this.styles();
      return (
        this[0].offsetHeight +
        parseFloat(styles.getPropertyValue('margin-top')) +
        parseFloat(styles.getPropertyValue('margin-bottom'))
      );
    }
    return this[0].offsetHeight;
  }
  return null;
}

/**
 * 兼容 jQuery，dom7 是错误的
 * wia 中，window 滚动被 .page-content 页面层替代
 */
function offset(coordinates) {
  if (coordinates)
    return this.each(function (idx) {
      var $this = $(this),
        coords = $.funcArg(this, coordinates, idx, $this.offset()),
        parentOffset = $this.offsetParent().offset(),
        props = {
          top: coords.top - parentOffset.top,
          left: coords.left - parentOffset.left,
        };

      if ($this.css('position') === 'static') props.position = 'relative';
      $this.css(props);
    });
  if (!this.length) return null;
  if (document.documentElement !== this[0] && !$.contains(document.documentElement, this[0]))
    return {top: 0, left: 0};
  const obj = this[0].getBoundingClientRect();
  const pg = this.closest('.page-content');
  const scrollX = pg.length ? pg.dom.scrollLeft : window.pageXOffset;
  const scrollY = pg.length ? pg.dom.scrollTop : window.pageYOffset;
  return {
    left: obj.left + scrollX,
    top: obj.top + scrollY,
    width: Math.round(obj.width),
    height: Math.round(obj.height),
  };
}

function rect() {
  if (!this.length) return null;
  if (document.documentElement !== this[0] && !$.contains(document.documentElement, this[0]))
    return {top: 0, left: 0};
  const obj = this[0].getBoundingClientRect();
  return {
    left: obj.left,
    top: obj.top,
    width: Math.round(obj.width),
    height: Math.round(obj.height),
  };
}

function position() {
  if (!this.length) return;

  var elem = this[0],
    // Get *real* offsetParent
    offsetParent = this.offsetParent(),
    // Get correct offsets
    offset = this.offset(),
    parentOffset = rootNodeRE.test(offsetParent[0].nodeName)
      ? {top: 0, left: 0}
      : offsetParent.offset();

  // Subtract element margins
  // note: when an element has margin: auto the offsetLeft and marginLeft
  // are the same in Safari causing offset.left to incorrectly be 0
  offset.top -= parseFloat($(elem).css('margin-top')) || 0;
  offset.left -= parseFloat($(elem).css('margin-left')) || 0;

  // Add offsetParent borders
  parentOffset.top += parseFloat($(offsetParent[0]).css('border-top-width')) || 0;
  parentOffset.left += parseFloat($(offsetParent[0]).css('border-left-width')) || 0;

  // Subtract the two offsets
  return {
    top: offset.top - parentOffset.top,
    left: offset.left - parentOffset.left,
  };
}

function offsetParent() {
  return this.map(function () {
    let pt = this.offsetParent || document.body;
    while (pt && !rootNodeRE.test(pt.nodeName) && $(pt).css('position') == 'static')
      pt = pt.offsetParent;
    return pt;
  });
}

function hide() {
  return this.each(function () {
    if (this.style.display !== 'none') this.style.display = 'none';
  });
}

function defaultDisplay(nodeName) {
  if (!elementDisplay[nodeName]) {
    const el = document.createElement(nodeName);
    document.body.appendChild(el);
    let display = getComputedStyle(el, '').getPropertyValue('display');
    el.parentNode.removeChild(el);
    display === 'none' && (display = 'block');
    elementDisplay[nodeName] = display;
  }
  return elementDisplay[nodeName];
}

function show() {
  return this.each(function () {
    this.style.display === 'none' && (this.style.display = '');
    // Still not visible
    if (getComputedStyle(this, '').getPropertyValue('display') === 'none')
      this.style.display = defaultDisplay(this.nodeName); // block
  });

  /*
  for (let i = 0; i < this.length; i += 1) {
    const el = this[i];
    if (el.style.display === 'none') {
      el.style.display = '';
    }
    if (window.getComputedStyle(el, null).getPropertyValue('display') === 'none') {
      // Still not visible
      el.style.display = 'block';
    }
  }
  return this;
	*/
}

function replaceWith(newContent) {
  return this.before(newContent).remove();
}

function styles() {
  if (this[0]) return window.getComputedStyle(this[0], null);
  return {};
}

function css(props, value) {
  const REGEXP_SUFFIX = /^width|height|left|top|marginLeft|marginTop|paddingLeft|paddingTop$/;

  let i;
  if (arguments.length === 1) {
    if (typeof props === 'string') {
      if (this[0]) return window.getComputedStyle(this[0], null).getPropertyValue(props);
    } else {
      for (i = 0; i < this.length; i += 1) {
        // eslint-disable-next-line
        for (let prop in props) {
          let v = props[prop];
          if (REGEXP_SUFFIX.test(prop) && $.isNumber(v)) v = `${v}px`;

          this[i].style[prop] = v;
        }
      }
      return this;
    }
  }
  if (arguments.length === 2 && typeof props === 'string') {
    for (i = 0; i < this.length; i += 1) {
      let v = value;
      if (REGEXP_SUFFIX.test(props) && $.isNumber(v)) v = `${v}px`;

      this[i].style[props] = v;
    }
    return this;
  }
  return this;
}

/**
 * 与jQuery 兼容，第一个参数为索引
 * @param {*} callback
 * @returns
 */
function each(callback) {
  emptyArray.some.call(this, function (el, idx) {
    return callback.call(el, idx, el) === false; // 退出
  });
  return this;
}

/**
 * 第一个参数为元素、第二个为索引
 * @param {*} callback
 * @returns
 */
function forEach(callback) {
  emptyArray.some.call(this, function (el, idx) {
    return callback.call(el, el, idx) === false;
  });
  return this;
}

/**
 * 第一个参数为元素、第二个为索引
 * @param {*} callback
 * @returns
 */
function some(callback) {
  return emptyArray.some.call(this, function (el, idx) {
    return callback.call(el, el, idx);
  });
}

/**
 * 第一个参数为元素、第二个为索引
 * @param {*} callback
 * @returns
 */
function every(callback) {
  return emptyArray.every.call(this, function (el, idx) {
    return callback.call(el, el, idx);
  });
}

/**
 * 排除 dom 节点
 * @param {*} sel 函数、nodeList、选择器
 * @returns Dom对象
 */
function not(sel) {
  const R = [];
  if ($.isFunction(sel) && sel.call)
    this.each(function (id) {
      if (!sel.call(this, id)) R.push(this);
    });
  else {
    var excludes =
      typeof sel == 'string'
        ? this.filter(sel)
        : likeArray(sel) && isFunction(sel.item)
        ? emptyArray.slice.call(sel)
        : $(sel);
    this.forEach(function (el) {
      if (excludes.indexOf(el) < 0) R.push(el);
    });
  }
  return $(R);
}

/**
 * 过滤符合要求的dom节点的Dom对象
 * @param {*} sel
 * @returns
 */
function filter(sel) {
  let R = [];
  try {
    // 回调函数
    if ($.isFunction(sel) && sel.call) {
      this.each(function (id, it) {
        if (sel.call(this, id, it)) R.push(this);
      });
    } else
      R = emptyArray.filter.call(this, function (el) {
        return $.matches(el, sel);
      });
  } catch (e) {}

  return $(R);
}

function map(cb) {
  return $(
    $.map(this, function (el, i) {
      return cb.call(el, i, el);
    })
  );
}

function clone() {
  return this.map(function () {
    return this.cloneNode(true);
  });
}

function html(v) {
  return 0 in arguments
    ? this.each(function (idx) {
        var originHtml = this.innerHTML;
        $(this).empty().append($.funcArg(this, v, idx, originHtml));
      })
    : 0 in this
    ? this[0].innerHTML
    : undefined;
}

/**
 * 返回数组节点指定属性数组
 * @param {*} p
 * @returns
 */
function pluck(p) {
  return $.map(this, function (el) {
    return el[p];
  });
}

function text(tx) {
  return 0 in arguments
    ? this.each(function (idx) {
        var newText = $.funcArg(this, tx, idx, this.textContent);
        this.textContent = newText == null ? '' : '' + newText;
      })
    : 0 in this
    ? this.pluck('textContent').join('')
    : undefined;
}

function is(sel) {
  return this.length > 0 && $.matches(this[0], sel);
}

function indexOf(el) {
  for (let i = 0; i < this.length; i += 1) {
    if (this[i] === el) return i;
  }
  return -1;
}
function index() {
  let chd = this[0];
  let i;
  if (chd) {
    i = 0;
    // eslint-disable-next-line
    while ((chd = chd.previousSibling) !== null) {
      if (chd.nodeType === 1) i += 1;
    }
    return i;
  }
  return undefined;
}

function slice(...args) {
  return $(emptyArray.slice.apply(this, args));
}

/**
 * 返回指定索引dom元素的Dom对象
 * @param {*} idx
 */
function eq(idx) {
  if (typeof idx === 'undefined') return this;
  const {length} = this;
  if (idx > length - 1 || length + idx < 0) {
    return $();
  }
  return idx === -1 ? this.slice(idx) : this.slice(idx, +idx + 1);
}

function first() {
  const el = this[0];
  return el && !$.isObject(el) ? el : $(el);
}

function last() {
  const el = this[this.length - 1];
  return el && !$.isObject(el) ? el : $(el);
}

/**
 * 同级后节点，如果符合条件返回节点，不符合条件，返回空节点，不含文本节点
 */
function next(selector) {
  if (this.length > 0) {
    if (selector) {
      if (this[0].nextElementSibling && $(this[0].nextElementSibling).is(selector)) {
        return $([this[0].nextElementSibling]);
      }
      return $();
    }

    if (this[0].nextElementSibling) return $([this[0].nextElementSibling]);
    return $();
  }
  return $();
}

/**
 * 同级向后查找符合条件的第一个元素节点，不含文本节点
 */
function nextNode(selector) {
  const nextEls = [];
  const el = this[0];
  if (!el) return $();

  let next = el.nextElementSibling; // eslint-disable-line
  while (next) {
    if (selector) {
      if ($(next).is(selector)) {
        nextEls.push(next);
        break;
      }
    } else {
      nextEls.push(next);
      break;
    }
    next = next.nextElementSibling;
  }
  return $(nextEls);
}

/**
 * 同级向后查找所有符合条件的元素节点，不含文本节点
 */
function nextAll(selector) {
  const nextEls = [];
  let el = this[0];
  if (!el) return $();
  while (el.nextElementSibling) {
    const next = el.nextElementSibling; // eslint-disable-line
    if (selector) {
      if ($(next).is(selector)) nextEls.push(next);
    } else nextEls.push(next);
    el = next;
  }
  return $(nextEls);
}

/**
 * 同级前节点，如果符合条件返回节点，不符合条件，返回空节点，不含文本节点
 */
function prev(selector) {
  if (this.length > 0) {
    const el = this[0];
    if (selector) {
      if (el.previousElementSibling && $(el.previousElementSibling).is(selector)) {
        return $([el.previousElementSibling]);
      }
      return $();
    }

    if (el.previousElementSibling) return $([el.previousElementSibling]);
    return $();
  }
  return $();
}

/**
 * 同级向前查找符合条件的第一个元素节点，不含文本节点
 */
function prevNode(selector) {
  const prevEls = [];
  const el = this[0];
  if (!el) return $();

  let prev = el.previousElementSibling; // eslint-disable-line
  while (prev) {
    if (selector) {
      if ($(prev).is(selector)) {
        prevEls.push(prev);
        break;
      }
    } else {
      prevEls.push(prev);
      break;
    }
    prev = prev.previousElementSibling;
  }
  return $(prevEls);
}

/**
 * 同级向前查找所有符合条件的元素节点，不含文本节点
 */
function prevAll(selector) {
  const prevEls = [];
  let el = this[0];
  if (!el) return $();
  while (el.previousElementSibling) {
    const prev = el.previousElementSibling; // eslint-disable-line
    if (selector) {
      if ($(prev).is(selector)) prevEls.push(prev);
    } else prevEls.push(prev);
    el = prev;
  }
  return $(prevEls);
}

/**
 * 同级前后所有兄弟元素节点，不含文本节点
 */
function siblings(selector) {
  return this.nextAll(selector).add(this.prevAll(selector));
}

/**
 * 所有dom节点符合条件的父元素
 */
function parent(selector) {
  const parents = []; // eslint-disable-line
  for (let i = 0; i < this.length; i += 1) {
    if (this[i].parentNode !== null) {
      if (selector) {
        if ($(this[i].parentNode).is(selector)) parents.push(this[i].parentNode);
      } else {
        parents.push(this[i].parentNode);
      }
    }
  }
  return $($.uniq(parents));
}

/**
 * 从当前元素的父元素开始沿 DOM 树向上,获得匹配选择器的所有祖先元素。
 */
function parents(selector) {
  const parents = []; // eslint-disable-line
  for (let i = 0; i < this.length; i += 1) {
    let parent = this[i].parentNode; // eslint-disable-line
    while (parent) {
      if (selector) {
        if ($(parent).is(selector)) parents.push(parent);
      } else parents.push(parent);

      parent = parent.parentNode;
    }
  }
  return $($.uniq(parents));
}

/**
 * 从当前元素的父元素开始沿 DOM 树向上,获得匹配选择器的第一个祖先元素。
 * 选择器为空，则返回 空
 */
function parentNode(sel) {
  const R = [];

  for (let i = 0; i < this.length; i += 1) {
    let pn = this[i].parentNode;
    while (pn) {
      if (sel) {
        if ($(pn).is(sel)) {
          R.push(pn);
          return $(R, sel);
        }
      } else {
        R.push(pn);
        return $(R, sel);
      }

      pn = pn.parentNode;
    }
  }
  return $(R, sel);
}

/**
 * 从当前元素开始沿 DOM 树向上,获得匹配选择器的第一个祖先元素。
 * 当前节点符合，则返回当前节点
 * 选择器为空，则返回 空
 */
function closest(sel) {
  let self = this; // eslint-disable-line
  if (typeof sel === 'undefined') return $();

  // ~开头，按 name 属性查找
  if (sel[0] === '~') sel = `[name=${sel.substr(1)}]`;

  if (!self.is(sel)) {

    for (let i = 0; i < this.length; i += 1) {
      let parent = this[i].parentNode; // eslint-disable-line
      while (parent) {
        const d = $(parent);
        if (d.is(sel)) return d;

        parent = parent.parentNode;
      }
    }

    return $();
  }

  return self;
}

function upper(sel) {
  return closest.bind(this)(sel);
}

/**
 * 后代中所有适合选择器的元素
 * @param {*} sel
 */
function find(sel) {
  let R = null;
  if (!sel) return $();

  // ~开头，按 name 属性查找
  if (sel[0] === '~') sel = `[name=${sel.substr(1)}]`;

  const self = this;
  // 选择器为对象
  if (typeof sel === 'object')
    R = $(sel).filter(function () {
      const node = this;
      return emptyArray.some.call(self, function (pn) {
        return $.contains(pn, node);
      });
    });
  else if (this.length === 1) R = $($.qsa(sel, this[0]));
  else
    R = this.map(function () {
      return $.qsa(sel, this);
    });

  return R || $();
}

/**
 * 后代中单个适合选择器的元素，效率高于find
 * 不支持对象参数
 * @param {*} sel
 */
function findNode(sel) {
  let R = null;
  if (!sel) return $();

  // ~开头，按 name 属性查找
  if (sel[0] === '~') sel = `[name=${sel.substr(1)}]`;

  if (this.length === 1) R = $($.qu(sel, this[0]));
  else
    R = this.map(function () {
      return $.qu(sel, this);
    });

  return R || $();
}

/**
 * 返回所有dom的所有符合条件的直接子元素，不包括文本节点
 * @param {*} sel
 */
function children(sel) {
  const cs = []; // eslint-disable-line
  for (let i = 0; i < this.length; i += 1) {
    const childs = this[i].children;

    for (let j = 0; j < childs.length; j += 1) {
      if (!sel) {
        cs.push(childs[j]);
      } else if ($(childs[j]).is(sel)) cs.push(childs[j]);
    }
  }
  return $($.uniq(cs));
}

/**
 * 返回被选元素的第一个符合条件直接子元素，不包括文本节点
 * @param {*} sel
 */
function childNode(sel) {
  return child.bind(this)(sel);
}

/**
 * 返回被选元素的第一个符合条件直接单个子元素，不包括文本节点
 * 或者 替换节点的所有子元素
 * @param {*} sel
 */
function child(sel) {
  if ($.isDom(sel)) {
    this.empty().append(sel);
    return this;
  }

  const cs = []; // eslint-disable-line
  for (let i = 0; i < this.length; i += 1) {
    const childs = this[i].children;

    for (let j = 0; j < childs.length; j += 1) {
      if (!sel) {
        cs.push(childs[j]);
        break;
      } else if ($(childs[j]).is(sel)) {
        cs.push(childs[j]);
        break;
      }
    }
  }
  return $(cs, sel);
}

function remove() {
  return this.each(function () {
    if (this.parentNode != null) this.parentNode.removeChild(this);
  });
}

function detach() {
  return this.remove();
}

function add(...args) {
  const dom = this;
  let i;
  let j;
  for (i = 0; i < args.length; i += 1) {
    const toAdd = $(args[i]);
    for (j = 0; j < toAdd.length; j += 1) {
      dom[dom.length] = toAdd[j];
      dom.length += 1;
    }
  }
  return dom;
}

function empty() {
  return this.each(function () {
    this.innerHTML = '';
  });
}

/**
 * 是否包含子元素，不含文本节点
 */
function hasChild() {
  if (!this.dom) return false;
  return this.dom.children.length > 0;
}

/**
 * 第一个子元素节点，不含文本节点
 */
function firstChild() {
  if (!this.dom || this.dom.children.length === 0) return null;
  return $([this.dom.children[0]]);
}

/**
 * 最后一个子元素节点，不含文本节点
 */
function lastChild() {
  if (!this.dom || this.dom.children.length === 0) return null;
  return $([this.dom.children[this.dom.children.length - 1]]);
}

/**
 * 元素子节点数量，不含文本节点
 */
function childCount() {
  if (!this.dom) return 0;
  return this.dom.children.length;
}

/**
 * 光标放入尾部
 * @param el
 */
function cursorEnd() {
  if (!this.dom) return null;

  const el = this.dom;
  el.focus();

  if (typeof window.getSelection !== 'undefined' && typeof document.createRange !== 'undefined') {
    const rg = document.createRange();
    rg.selectNodeContents(el);
    // 合并光标
    rg.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(rg);
  } else if (typeof document.body.createTextRangrge !== 'undefined') {
    const rg = document.body.createTextRange();
    rg.moveToElementText(el);
    // 合并光标
    rg.collapse(false);
    // textRange.moveStart('character', 3);
    rg.select();
  }
}

/**
 * 获取光标位置
 * @returns {number}
 */
function getCursorPos() {
  let R = 0;

  if (!this.dom) return 0;

  const el = this.dom;

  // obj.focus();
  if (el.selectionStart) {
    // IE以外
    R = el.selectionStart;
  } else {
    // IE
    let rg = null;
    if (el.tagName.toLowerCase() === 'textarea') {
      // TEXTAREA
      rg = event.srcElement.createTextRange();
      rg.moveToPoint(event.x, event.y);
    } else {
      // Text
      rg = document.selection.createRange();
    }
    rg.moveStart('character', -event.srcElement.value.length);
    // rg.setEndPoint("StartToStart", obj.createTextRange())
    R = rg.text.length;
  }
  return R;
}

/**
 * 得到光标的位置
 */
function getCursorPosition() {
  if (!this.dom) return 0;

  const el = this.dom;

  const qswh = '@#%#^&#*$';
  // obj.focus();
  const rng = document.selection.createRange();
  rng.text = qswh;
  const nPosition = el.value.indexOf(qswh);
  rng.moveStart('character', -qswh.length);
  rng.text = '';
  return nPosition;
}

/**
 * 设置光标位置
 */
function setCursorPos(pos) {
  if (!this.dom) return;

  const rg = this.dom.createTextRange();
  rg.collapse(true);
  rg.moveStart('character', pos);
  rg.select();
}

/**
 * 移到第一行
 */
function moveFirst() {
  this.rowindex = 0;
}

/**
 * querySelector
 * return only first
 */
function qu(sel) {
  let n = [];
  try {
    n = this.dom?.querySelector(sel);
  } catch (e) {}

  return $(n || []);
}

function qus(sel) {
  return $(sel, this.dom);
}

/**
 * querySelector attribute
 * return only first
 */
function att(n, v) {
  let R = [];
  try {
    if (this.attr(n) === v) return this; // 自己符合，返回自身
    R = this.dom?.querySelector(`[${n}=${v}]`);
  } catch (e) {}
  return $(R || []);
}

function atts(n, v) {
  let R = [];
  try {
    R = $(`[${n}=${v}]`, this.dom);
    if (this.attr(n) === v) R.push(this.dom); // 自己符合，添加自身
  } catch (e) {}
  return $(R || []);
}

/**
 * querySelector name
 * return only first
 */
function name(v) {
  return this.att('name', v);
}

function fastLink() {
  $.fastLink(this);
  return this;
}

/**
 * name 属性组件直接绑定到当前Dom实例，方便调用
 * 只挂载一个，多个同名name，最后一个起作用，因此一个页面内，name不要重复
 * 同节点多次调用不覆盖，同名不同dom节点，覆盖
 * 覆盖后，原直接节点属性的 bind 会失效，需使用新的$dom重新bind
 * 动态内容一般在 ready 中创建，创建后name会自动挂载
 * show/back 中创建的动态内容，未自动挂载，需调用 bindName 挂载！
 */
function bindName() {
  const ns = this.qus('[name]');
  ns?.forEach(n => {
    const $n = $(n);
    const nm = $n.attr('name');
    if (!this.n) this.n = {};
    if (!this.n[nm] || this.n[nm].dom !== n) this.n[nm] = $n;
    if (!this[nm] || (D.isD(this[nm]) && this[nm].dom !== n)) this[nm] = $n;
  });

  return this;
}

function names(v) {
  return this.atts('name', v);
}

/**
 * querySelector ClassName
 * cls: 'aaa, bbb' => '.aaa, .bbb'
 * return only first node
 */
function clas(cls) {
  let R = [];

  if (!cls) return $();

  try {
    const rs = [];
    const cs = cls.split(',');
    cs.forEach(c => {
      if (c) {
        if (c.includes('.')) rs.push(c.trim());
        else rs.push(`.${c.trim()}`);
      }
    });

    R = this.dom?.querySelector(rs.join(','));
  } catch (e) {}

  return $(R || []);
}

/**
 * querySelectorAll ClassName
 * cls: 'aaa, bbb' => '.aaa, .bbb'
 * return all node
 */
function classes(cls) {
  let R = [];

  if (!cls) return $();

  try {
    const rs = [];
    const cs = cls.split(',');
    cs.forEach(c => {
      if (c.includes('.')) rs.push(c.trim());
      else rs.push(`.${c.trim()}`);
    });

    const ns = this.dom?.querySelectorAll(rs.join(','));
    // if (ns && ns.length > 0) R = slice.call(ns);
    if (ns && ns.length > 0) R = Array.from(ns);
  } catch (e) {}

  return $(R || []);
}

/**
 * querySelector TagName
 * tag: 'div'
 * return only first
 */
function tag(t) {
  let R = this.dom?.getElementsByTagName(t);
  if (R) R = R[0];

  return $(R);
}

function tags(t) {
  let R = this.dom?.getElementsByTagName(t);
  if (R && R.length > 0) R = [].slice.call(R);
  else R = [];

  return $(R);
}

const Methods = /*#__PURE__*/Object.freeze({
  __proto__: null,
  add: add,
  animationEnd: animationEnd,
  att: att,
  attr: attr,
  atts: atts,
  bindName: bindName,
  child: child,
  childCount: childCount,
  childNode: childNode,
  children: children,
  class: clas,
  classes: classes,
  clone: clone,
  closest: closest,
  concat: concat,
  css: css,
  cursorEnd: cursorEnd,
  data: data,
  dataset: dataset,
  detach: detach,
  each: each,
  empty: empty,
  eq: eq,
  every: every,
  fastLink: fastLink,
  filter: filter,
  find: find,
  findNode: findNode,
  first: first,
  firstChild: firstChild,
  forEach: forEach,
  get: get,
  getCursorPos: getCursorPos,
  getCursorPosition: getCursorPosition,
  hasAttr: hasAttr,
  hasChild: hasChild,
  height: height,
  hide: hide,
  html: html,
  index: index,
  indexOf: indexOf,
  is: is,
  last: last,
  lastChild: lastChild,
  map: map,
  moveFirst: moveFirst,
  name: name,
  names: names,
  next: next,
  nextAll: nextAll,
  nextNode: nextNode,
  not: not,
  off: off,
  offset: offset,
  offsetParent: offsetParent,
  on: on,
  once: once,
  outerHeight: outerHeight,
  outerWidth: outerWidth,
  parent: parent,
  parentNode: parentNode,
  parents: parents,
  pluck: pluck,
  position: position,
  prev: prev,
  prevAll: prevAll,
  prevNode: prevNode,
  prop: prop,
  qu: qu,
  qus: qus,
  ready: ready,
  rect: rect,
  remove: remove,
  removeAttr: removeAttr,
  removeData: removeData,
  removeProp: removeProp,
  replaceWith: replaceWith,
  setCursorPos: setCursorPos,
  show: show,
  siblings: siblings,
  size: size,
  slice: slice,
  some: some,
  styles: styles,
  tag: tag,
  tags: tags,
  text: text,
  toArray: toArray,
  transform: transform,
  transition: transition,
  transitionEnd: transitionEnd,
  trigger: trigger,
  upper: upper,
  val: val,
  width: width
});

/**
 * 支持按动画滚动窗口
 * @param  {...any} args
 * left, top, duration, easing, callback
 * @returns
 */
function scrollTo(...args) {
  let [left, top, duration, easing, callback] = args;
  if (args.length === 4 && typeof easing === 'function') {
    callback = easing;
    [left, top, duration, callback, easing] = args;
  }
  if (typeof easing === 'undefined') easing = 'swing';

  return this.each(function animate() {
    const el = this; // dom

    let currentTop;
    let currentLeft;
    let maxTop;
    let maxLeft;
    let newTop;
    let newLeft;
    let scrollTop; // eslint-disable-line
    let scrollLeft; // eslint-disable-line

    if (typeof easing === 'undefined') easing = 'swing';
    const hasScrollTop = 'scrollTop' in el;
    const hasScrollLeft = 'scrollLeft' in el;

    let animateTop = top > 0 || top === 0;
    let animateLeft = left > 0 || left === 0;

    if (animateTop) {
      currentTop = el.scrollTop;
      if (!duration) {
        if (hasScrollTop) el.scrollTop = top;
        else el.scrollTo(el.scrollX, top);
      }
    }

    if (animateLeft) {
      currentLeft = el.scrollLeft;
      if (!duration) {
        if (hasScrollLeft) el.scrollLeft = left;
        else el.scrollTo(left, el.scrollY);
      }
    }

    // 不需要动画
    if (!duration) return;

    // 延时动画
    if (animateTop) {
      maxTop = el.scrollHeight - el.offsetHeight;
      newTop = Math.max(Math.min(top, maxTop), 0);
    }

    if (animateLeft) {
      maxLeft = el.scrollWidth - el.offsetWidth;
      newLeft = Math.max(Math.min(left, maxLeft), 0);
    }

    let startTime = null;
    if (animateTop && newTop === currentTop) animateTop = false;
    if (animateLeft && newLeft === currentLeft) animateLeft = false;

    function render(time = new Date().getTime()) {
      if (startTime === null) {
        startTime = time;
      }
      const progress = Math.max(Math.min((time - startTime) / duration, 1), 0);
      const easeProgress =
        easing === 'linear' ? progress : 0.5 - Math.cos(progress * Math.PI) / 2;

      let done;
      if (animateTop)
        scrollTop = currentTop + easeProgress * (newTop - currentTop);
      if (animateLeft)
        scrollLeft = currentLeft + easeProgress * (newLeft - currentLeft);
      if (animateTop && newTop > currentTop && scrollTop >= newTop) {
        el.scrollTop = newTop;
        done = true;
      }
      if (animateTop && newTop < currentTop && scrollTop <= newTop) {
        el.scrollTop = newTop;
        done = true;
      }
      if (animateLeft && newLeft > currentLeft && scrollLeft >= newLeft) {
        el.scrollLeft = newLeft;
        done = true;
      }
      if (animateLeft && newLeft < currentLeft && scrollLeft <= newLeft) {
        el.scrollLeft = newLeft;
        done = true;
      }

      if (done) {
        if (callback) callback();
        return;
      }

      if (animateTop) el.scrollTop = scrollTop;
      if (animateLeft) el.scrollLeft = scrollLeft;
      $.requestAnimationFrame(render);
    }
    $.requestAnimationFrame(render);
  });
}

/**
 * 垂直滚动
 * @param  {...any} args
 * top 滚动距离
 * duration 动画时长
 * easing 动画
 * callback 滚动完成后的回调
 * @returns
 */
function scrollTop(...args) {
  if (!this.length) return;

  let [top, duration, easing, callback] = args;
  if (args.length === 3 && typeof easing === 'function') {
    [top, duration, callback, easing] = args;
  }
  const hasScrollTop = 'scrollTop' in this[0];

  // 没有传值，则取回当前dom节点的scrollTop
  if (top === undefined)
    return hasScrollTop ? this[0].scrollTop : this[0].pageYOffset;

  return this.scrollTo(undefined, top, duration, easing, callback);
}

/**
 * 水平滚动
 * @param  {...any} args
 * left 滚动距离
 * duration 动画时长
 * easing 动画
 * callback 滚动完成后的回调
 * @returns
 */
function scrollLeft(...args) {
  if (!this.length) return;

  let [left, duration, easing, callback] = args;
  if (args.length === 3 && typeof easing === 'function') {
    [left, duration, callback, easing] = args;
  }

  const hasScrollLeft = 'scrollLeft' in this[0];
  if (left === undefined)
    return hasScrollLeft ? this[0].scrollLeft : this[0].pageXOffset;

  return this.scrollTo(left, undefined, duration, easing, callback);
}

function scrollHeight() {
  return this[0].scrollHeight;
}

function scrollWidth() {
  return this[0].scrollWidth;
}

const Scroll = /*#__PURE__*/Object.freeze({
  __proto__: null,
  scrollHeight: scrollHeight,
  scrollLeft: scrollLeft,
  scrollTo: scrollTo,
  scrollTop: scrollTop,
  scrollWidth: scrollWidth
});

function animate(initialProps, initialParams) {
  const els = this;
  const a = {
    props: Object.assign({}, initialProps),
    params: Object.assign(
      {
        duration: 300,
        easing: 'swing', // or 'linear'
        /* Callbacks
      begin(elements)
      complete(elements)
      progress(elements, complete, remaining, start, tweenValue)
      */
      },
      initialParams
    ),

    elements: els,
    animating: false,
    que: [],

    easingProgress(easing, progress) {
      if (easing === 'swing') {
        return 0.5 - Math.cos(progress * Math.PI) / 2;
      }
      if (typeof easing === 'function') {
        return easing(progress);
      }
      return progress;
    },
    stop() {
      if (a.frameId) {
        $.cancelAnimationFrame(a.frameId);
      }
      a.animating = false;
      a.elements.each((index, el) => {
        const element = el;
        delete element.dom7AnimateInstance;
      });
      a.que = [];
    },
    done(complete) {
      a.animating = false;
      a.elements.each((index, el) => {
        const element = el;
        delete element.domAnimateInstance;
      });
      if (complete) complete(els);
      if (a.que.length > 0) {
        const que = a.que.shift();
        a.animate(que[0], que[1]);
      }
    },
    animate(props, params) {
      if (a.animating) {
        a.que.push([props, params]);
        return a;
      }
      const elements = [];

      // Define & Cache Initials & Units
      a.elements.each((index, el) => {
        let initialFullValue;
        let initialValue;
        let unit;
        let finalValue;
        let finalFullValue;

        if (!el.dom7AnimateInstance) a.elements[index].domAnimateInstance = a;

        elements[index] = {
          container: el,
        };
        Object.keys(props).forEach(prop => {
          initialFullValue = window
            .getComputedStyle(el, null)
            .getPropertyValue(prop)
            .replace(',', '.');
          initialValue = parseFloat(initialFullValue);
          unit = initialFullValue.replace(initialValue, '');
          finalValue = parseFloat(props[prop]);
          finalFullValue = props[prop] + unit;
          elements[index][prop] = {
            initialFullValue,
            initialValue,
            unit,
            finalValue,
            finalFullValue,
            currentValue: initialValue,
          };
        });
      });

      let startTime = null;
      let time;
      let elementsDone = 0;
      let propsDone = 0;
      let done;
      let began = false;

      a.animating = true;

      function render() {
        time = new Date().getTime();
        let progress;
        let easeProgress;
        // let el;
        if (!began) {
          began = true;
          if (params.begin) params.begin(els);
        }
        if (startTime === null) {
          startTime = time;
        }
        if (params.progress) {
          // eslint-disable-next-line
          params.progress(
            els,
            Math.max(Math.min((time - startTime) / params.duration, 1), 0),
            startTime + params.duration - time < 0
              ? 0
              : startTime + params.duration - time,
            startTime
          );
        }

        elements.forEach(element => {
          const el = element;
          if (done || el.done) return;
          Object.keys(props).forEach(prop => {
            if (done || el.done) return;
            progress = Math.max(
              Math.min((time - startTime) / params.duration, 1),
              0
            );
            easeProgress = a.easingProgress(params.easing, progress);
            const {initialValue, finalValue, unit} = el[prop];
            el[prop].currentValue =
              initialValue + easeProgress * (finalValue - initialValue);
            const currentValue = el[prop].currentValue;

            if (
              (finalValue > initialValue && currentValue >= finalValue) ||
              (finalValue < initialValue && currentValue <= finalValue)
            ) {
              el.container.style[prop] = finalValue + unit;
              propsDone += 1;
              if (propsDone === Object.keys(props).length) {
                el.done = true;
                elementsDone += 1;
              }
              if (elementsDone === elements.length) {
                done = true;
              }
            }
            if (done) {
              a.done(params.complete);
              return;
            }
            el.container.style[prop] = currentValue + unit;
          });
        });
        if (done) return;
        // Then call
        a.frameId = $.requestAnimationFrame(render);
      }
      a.frameId = $.requestAnimationFrame(render);
      return a;
    },
  };

  if (a.elements.length === 0) {
    return els;
  }

  let animateInstance;
  for (let i = 0; i < a.elements.length; i += 1) {
    if (a.elements[i].domAnimateInstance) {
      animateInstance = a.elements[i].domAnimateInstance;
    } else a.elements[i].domAnimateInstance = a;
  }
  if (!animateInstance) {
    animateInstance = a;
  }

  if (initialProps === 'stop') {
    animateInstance.stop();
  } else {
    animateInstance.animate(a.props, a.params);
  }

  return els;
}

function stop() {
  const els = this;
  for (let i = 0; i < els.length; i += 1) {
    if (els[i].domAnimateInstance) {
      els[i].domAnimateInstance.stop();
    }
  }
}

/**
 * 通过css3 Translate 移动后，获取 x 或 y 坐标
 * @param {*} el
 * @param {*} axis
 */
function getTranslate(axis = 'x') {
  const els = this;
  if (!els || !els.dom) return 0;

  const el = els.dom;

  let matrix;
  let curTransform;
  let transformMatrix;

  const curStyle = window.getComputedStyle(el, null);

  if (window.WebKitCSSMatrix) {
    curTransform = curStyle.transform || curStyle.webkitTransform;
    if (curTransform.split(',').length > 6) {
      curTransform = curTransform
        .split(', ')
        .map(a => a.replace(',', '.'))
        .join(', ');
    }
    // Some old versions of Webkit choke when 'none' is passed; pass
    // empty string instead in this case
    transformMatrix = new window.WebKitCSSMatrix(
      curTransform === 'none' ? '' : curTransform
    );
  } else {
    transformMatrix =
      curStyle.MozTransform ||
      curStyle.OTransform ||
      curStyle.MsTransform ||
      curStyle.msTransform ||
      curStyle.transform ||
      curStyle
        .getPropertyValue('transform')
        .replace('translate(', 'matrix(1, 0, 0, 1,');
    matrix = transformMatrix.toString().split(',');
  }

  if (axis === 'x') {
    // Latest Chrome and webkits Fix
    if (window.WebKitCSSMatrix) curTransform = transformMatrix.m41;
    // Crazy IE10 Matrix
    else if (matrix.length === 16) curTransform = parseFloat(matrix[12]);
    // Normal Browsers
    else curTransform = parseFloat(matrix[4]);
  }
  if (axis === 'y') {
    // Latest Chrome and webkits Fix
    if (window.WebKitCSSMatrix) curTransform = transformMatrix.m42;
    // Crazy IE10 Matrix
    else if (matrix.length === 16) curTransform = parseFloat(matrix[13]);
    // Normal Browsers
    else curTransform = parseFloat(matrix[5]);
  }
  return curTransform || 0;
}

const Animate = /*#__PURE__*/Object.freeze({
  __proto__: null,
  animate: animate,
  getTranslate: getTranslate,
  stop: stop
});

/**
 * 实现页面视图（不限表单）与数据交互
 *
 *                         【ui view与数据】
 *
 * 数据与视图交互是所有带UI界面都需实现的基本功能，不同开发框架都制定了一套固定机制。
 * 其中web前端与所有其他UI（原生ios、安卓、windows）都不一样，其开放、自由、无主，
 * 导致没有一套固定机制，不同人、不同组织提供的开发框架、方式几十上百种。
 *
 *                         【jQuery、Dom】
 *
 * 最原始，是通过jQuery或浏览器内置Dom，操作页面视图元素。
 * 优点：自由控制，可享受编程乐趣。
 * 缺点：完全手工，工作量大，效率低、容易出错，逐渐被淘汰。
 *
 *                         【vue、react、angular】
 *
 * 主流vue、react、angular通过v-dom与数据双向绑定，实现视图与数据MVVM自动更新。
 * 优点：定义好数据与视图关联关系后，修改数据即可更新视图，不用操作视图。
 * 缺点: 需要学习一套新的定义语法及MVVM体系，一旦采用，基本上会全面采用其全家桶，
 * 包括路由、UI、状态等各种库，陷入其技术竖阱。
 *
 *                             【wia view】
 *
 * 通过自然es6模板字符串，与html中的name或模板字符串，与数据对应，实现数据展示。
 * 优点：
 *   1、与三大主流类似，无需UI操作，数据直接展现，开发效率高。
 *   2、只有一个dom，没有额外的虚拟dom（vdom），运行效率高。
 *   3、以函数方式提供，自由调用，无入侵。
 *   4、无门槛，无新语法，无复杂定义，自然流畅，只需HTML，无需学习新的知识体系。
 *   5、轻便透明，无复杂封装，可直接操作视图中的元素，体验编程乐趣。
 * 缺点：
 *   1、单向绑定，视图更新无法自动更新数据，获取数据需主动调用。是缺点，也是优点。
 *   2、太过简单，无复杂理论体系，无需学习，自然上手。是优点也是缺点。
 *
 *                         【wia view 原理】
 *
 * 需要展现的数据分类：
 *   1、简单值：字符串、数字、日期、布尔值。
 *   2、简单对象：简单值组成的对象，通过字段名称区分不同值。
 *   3、值数组：简单值组成的数组。
 *   4、对象数组：对象组成的数组。
 *   5、复杂对象：对象内字段包含数组、和子对象。
 *
 *                         【api】
 *
 * 1、view方法作为wia dom中的视图扩展，调用方法与jQuery方法类似，如：
 *    _.name('fmData').setForm(data);
 *    或：
 *    _.fmData.setForm(data);
 *
 * 2、$el.setView(data)
 *   将数据展现在页面$el范围的视图上。
 *   展现关键是如何将数据放到视图对应位置。
 *   对应方式：
 *     1、name：元素 name 属性。
 *     2、name-val：指定对应元素。
 *     3、name-tp：模板，模板用于数组的复制。
 *
 *   data 作为参数r，传递到视图，视图通过模板字符串获取数值。
 *   注意，默认 data 不按字段拆分！
 *   要求按字段拆分，需将 form 设置为 true；
 *   重复数据通过id 或 _id 字段判断，新增视图时，如表格，重复id 或 _id，删除旧的，创建新的。
 *   id 作为服务器返回的字段，_id 作为客户端本地添加的自增长字段。
 *
 * 3、$el.setForm(data)
 *   用于表单，数据对象按字段拆开调用 数据视图展示。
 *   等同于 setView中的 form 参数设置为 true。
 *
 * 4、$el.getForm
 *   读取页面表单数据，返回对象 或对象数组。
 *   读取数据，需使用 input，包括隐藏域。
 *   读取时，自动将隐藏域的data对象，转换为json字符串，方便FormData 提交。
 *
 * 5、$el.getView
 *   读取指定视图的val值，如有data，则返回data。
 *   如非Form表单，需将数据放到该元素 data 属性。
 *
 * 6、$el.clearView
 *   清除视图数据。
 *   清除带name属性元素值。
 *   删除name-tp模板复制产生名称为xxx-data元素。
 *
 * 7、$el.clearForm
 *   清除表单中 input、textarea值。
 *   删除name-tp模板复制产生名称为xxx-data元素。
 *
 * 8、$el.setViews
 *   setView目前未实现子对象按字段拆分展示（子对象直接作为参数展示）。
 *   setViews 按对象字段分别 setView。
 *   比如页面有三个视图，a、b、c，通过 {a:v1,b:v2,c:v3}，等于调用了三次setView。
 *
 *
 *                         【页面模板定义】
 *
 * 1. 简单数据直接填入 input的value。
 *   复杂数据，如对象、数组等，则填入 隐藏域 的data 对象。
 *   隐藏域（hidden）用于收集数据。并通过模板实现复杂数据展示。
 *
 * 2、页面模板定义：
 *   setView 不分解对象属性，将对象整体直接作为r参数传入页面。
 *   页面可使用${r.a}来引用该值。支持子对象${r.a.b}。
 *   ${r.a} 为es6中标准模版字符串，支持运算、变量。
 *
 * 3、图片src，模板需使用src-tp="http://${r.url}"，渲染时自动改为src。
 *   直接使用src浏览器会下载http://${r.url}，这个资源肯定找不到。
 *
 * 4、可复制模板：name-tp，一般传入对象数组或对象，用于拷贝赋值，模板自身隐藏。
 *   复制的元素名称为：name-data。
 *
 * 5、空数据，一般提供 name-empty元素，用于展示清空数据或初始无数据时展示，有数据时隐藏。。
 *
 * 6、key-value 键值对。
 *   属性tp="kv"，表示key-value键值对，对应模板中的${r.k} ${r.v}，用于同时引用对象属性名称及值。
 *   属性tp="kv-3"，表示三列。
 *   如：${r.k1} ${r.v1} ${r.k2} ${r.v2} ${r.k3} ${r.v3}
 *   对应对象中的第一个、第二个、第三个属性。
 *   用于横向多列对象多属性展现，比如 PC版本订单详情，横向3列。
 *
 * 7、名称：name-val：直接按模板替换，与名称为 name效果等同。
 *
 * 8、名称：name：如果内部有 ${字符，则视为直接替换模板，类似 name-val。
 */

/**
 * 视图数据展现
 * setViews 调用了 setView，为setView的批量操作
 * 数据内的元素，支持数组、对象，一次性实现整个容器的数据展现
 * 根据数据项名称，自动查找页面对应input（按名称） 或 视图层（name 或 name-tp），实现数据展现
 * 调用该方法的容器一般是 Form，也支持非Form，如 div
 * 容器中的节点， 一般是input， 也支持非input，通过对象属性名称对应dom名称实现匹配展现
 * 如果数据为数组，则使用调用者同名模板，生成多节点，
 * field、input隐藏域带模板，会按模板生成字段部分展现
 * 模板名称为 name-tp，根据模板添加后的节点名称为 name-data
 * @param {*} v 数据
 * @param {*} n 模板名称，可选，如果不填，默认调用者的name
 * 注意，setViews的模板与setView中的模板不一样
 * setViews 模板先调用clone克隆模板节点，不赋值，后续再调用 setView 进行赋值。
 * 意味着 setViews 中的模板里面可以再嵌套字段模板。
 * setView中的模板，使用带${r.name}这种插值模板，根据后台r数据，生成带数据值的 html。
 * @param {*} add 新增，可选
 */
function setViews(v, n, add = false) {
  try {
    const el = this;
    // 清空所有数据，填充新数据
    if (!add) clearForm.bind(el)();

    if (!n) n = el.attr('name');

    // 使用模板
    if (n) {
      const tp = el.name(`${n}-tp`);
      if (tp.length) {
        tp.hide();
        if ($.isArray(v))
          v.forEach(r => {
            addSet.bind(el)(n, r);
          });
        else addSet.bind(el)(n, v);
      } else Object.keys(v).forEach(k => setView.bind(el)(v[k], k));
    } else if ($.isObject(v))
      // 非模板
      Object.keys(v).forEach(k => setView.bind(el)(v[k], k));
  } catch (ex) {
    console.error('setViews exp.', {msg: ex.message});
  }
}

/**
 * 向 view 中添加值
 * @param {*} el 容器
 * @param {*} k 字段名称
 * @param {*} v 新增数据
 */
function addViews(v, n) {
  const el = this;
  if (!n) n = el.attr('name');
  setViews.bind(el)(v, n, true);
}

/**
 * 读取整个页面表单数据，返回对象 或对象数组
 * 需要被读取的数据，需使用 input，包括隐藏域，否则无法被读取
 * 读取时，自动将所有隐藏域的data对象，转换为字符串，方便FormData 提交服务器。
 * @param {*} n 模板名称，不填与容器名称相同，可选参数
 */
function getForm(n) {
  let R = null;
  try {
    const el = this;
    // 将data存入 value，方便FormData读取
    el.find('input[type=hidden]').forEach(d => {
      if (!$.isEmpty(d.data)) d.value = JSON.stringify(d.data);
    });

    if (!n) n = el.attr('name');

    // 对象列表表单，需删除模板，避免模板数据干扰数据获取
    const tp = el.name(`${n}-tp`);
    let prev = null;
    let hasTp = tp.length;
    if (hasTp) {
      hasTp = true;
      prev = tp.prev();
      tp.remove();
    }

    // 读取整个表单输入数据
    const fd = new FormData(el.dom);
    // 还原模板
    if (hasTp) tp.insertAfter(prev);

    const rs = [];
    let last = null;
    let r = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const e of fd.entries()) {
      const k = e[0];
      if (!last) last = k;
      else if (last === k) {
        if (!$.isEmpty(r)) rs.push({...r});
        r = {};
      }
      let v = e[1];
      // 还原对象
      try {
        if (/^\s*[{[]/.test(v)) v = JSON.parse(v);
      } catch (ex) {
        console.error('getForm exp.', {msg: ex.message});
      }
      r[k] = v;
    }

    if ($.hasVal(r)) rs.push(r);
    if (rs.length === 1) [R] = rs;
    else if (rs.length > 1) R = rs;
  } catch (ex) {
    console.error('getForm exp.', {msg: ex.message});
  }

  return R;
}

/**
 * 清除表单
 */
function clearForm() {
  try {
    const el = this;
    // 清除input值
    const es = el.find('input,textarea');
    es.forEach(e => {
      if (e.data) {
        e.data = null;
        delete e.data;
      }
      if (e.type !== 'checkbox') e.value = '';
    });

    // 清除 模板数据
    el.find('[name$=-data]').remove();
    el.find('[name$=-empty]').show();
  } catch (e) {
    console.error(`clearForm exp:${e.message}`);
  }
}

/**
 * 根据页面模板，设置视图数据
 * 模板为同名节点或tp模板
 * 数据支持两维数组、对象、对象数组等
 * 参数选项：opts: {
 *  add：是否新增
 *  name：指定视图名称，默认为当前Dom对象
 *  idx：数组索引
 *  form: 是否为表单，默认 false
 * }
 * 在Form表单中，一般用input来存放字符串值，如使用模板，input type 必须为 hidden
 * 在非Form中，没有input，同名dom，或者名称-tp为插值模板，将对象数据与模板匹配展示数据
 * tb.setView(data); // 数据
 * tb.setView(arr, 0); // 数组，第一列为id
 * tb.setView(arr, 0, 模板名称); // 数组，第一列为id
 * tb.setView(obj, 模板名称); //
 * tb.setView(arr, 0, 模板名称, add); // 第一列为id
 * tb.setView(obj, 模板名称, add); // 第一列为id, 对象数据，指定模版名称
 * @param {*} v 数据
 * @param {Number} idx 数组id列序号，可选
 * @param {*} name 视图名称，缺省为dom对象name属性，dom容器如无name，参数n不传，则不工作。
 * @param {*} add 重置还是新增，重置会清除数据项，默认为重置
 */
// function setView(v, idx = -1, name = '', add = false) {
function setView(v, ...args) {
  let R = false;
  try {
    if (v === undefined || v === null) return false;

    const el = this;
    let add = false;
    let idx = -1;
    // 表单视图
    let form = false;
    let name = el.attr('name');

    // 复合参数，兼容多参数
    if (args.length) {
      // opts
      if ($.isObject(args[0])) {
        const def = {add, name, idx, form};
        const opt = {...def, ...args[0]};
        ({add, name, idx, form} = opt);
      } else if ($.isArray(v) && $.isNumber(args[0])) {
        // eslint-disable-next-line
        if (args.length >= 1) idx = args[0];
        // eslint-disable-next-line
        if (args.length >= 2 && $.isString(args[1])) name = args[1];
        // eslint-disable-next-line
        if (args.length >= 3 && $.isBool(args[2])) add = args[2];
      } else {
        // if ($.isObject(v) && $.isBool(args[0])) add = args[0];
        // eslint-disable-next-line
        if (args.length >= 1) {
          if ($.isString(args[0])) name = args[0];
          else if ($.isBool(args[0])) add = args[0];
        }
        // eslint-disable-next-line
        if (args.length >= 2 && $.isBool(args[1])) add = args[1];
      }
    }

    // 查找是否包含 input
    // if (el.nodeName.toLowerCase() === 'form' || el.find('input,textarea').length) from = true;

    // 清除视图数据
    if (!add) {
      if (form) clearForm.bind(el)();
      clearView.bind(el)(name);
    }

    // 表单，需将对象拆开，按字段名称逐项赋值
    if (form && $.isObject(v)) {
      Object.keys(v).forEach(k => setData.bind(el)(k, v[k]));
    } else if (name) R = setData.bind(el)(name, v, idx); // 没有指定name的dom，可通过name-tp、name-val等模板赋值
  } catch (ex) {
    console.error('setView exp.', {msg: ex.message});
  }
  return R;
}

/**
 * 表单赋值
 * @param {*} v
 * @param {*} opts
 */
function setForm(v, opts) {
  const opt = opts || {};
  opt.form = true;
  setView.bind(this)(v, opt);
}

/**
 * 向 field 中添加值
 * tb.setView(d);
 * tb.setView(arr, 0); // 第一列为id
 * tb.setView(arr, 0, 模板名称); // 第一列为id
 * tb.setView(obj, 模板名称); // 第一列为id
 * tb.setView(arr, 0, 模板名称); // 第一列为id
 * tb.setView(obj, 模板名称); // 第一列为id
 * @param {*} v 数据
 * @param {*} n 视图名称，缺省为调用者name
 */
function addView(v, ...args) {
  const el = this;
  setView.bind(el)(v, ...args, true);
}

/**
 * 清除视图数据
 * @param {string=} n 视图名称
 */
function clearView(n) {
  try {
    const el = this;
    if (!n) n = el.attr('name');

    // 清除input值
    const es = el.names(n);
    es.forEach(e => {
      if (e.tagName.toLowerCase() === 'input' || e.tagName.toLowerCase() === 'textarea') {
        if (e.data) {
          e.data = null;
          delete e.data;
        }
        if (e.type !== 'checkbox') e.value = '';
      }
    });

    // 清除 模板数据
    el.names(`${n}-data`).remove();
    el.name(`${n}-empty`).show();
  } catch (e) {
    console.error(`clearView exp:${e.message}`);
  }
}

/**
 * 读取指定视图数据，返回 仅仅包含 指定视图的值，如果有data，则返回 对象
 * 读取时，自动将隐藏域的data对象，转换为字符串，方便FormData 提交服务器。
 * @param {*} n 视图名称
 */
function getView(n) {
  let R = null;
  try {
    const el = this;
    if (!n) n = el.attr('name');
    const d = el.name(n);
    if (d.length) {
      if ($.hasVal(d.data)) R = d.data;
      else R = d.val();
    }
  } catch (ex) {
    console.error('getView exp.', {msg: ex.message});
  }

  return R;
}

/**
 * 删除 chip，更新隐藏域，方便获取 chip 值
 * @param {*} e
 */
function removeChip(e) {
  console.log('removeChip', {e});

  const el = $(e.target).closest('.chip');
  if (el && el.length > 0) {
    let id = el.data('id');
    if (!id) id = el.data('_id');

    // 更新隐藏域
    const n = el.prevNode('input[type=hidden]');
    el.remove();
    if (n && n.length > 0) {
      id = n
        .val()
        .replace(new RegExp(`${id}\\s*,?\\s*`), '')
        .replace(/\s*,\s*$/, '');
      n.val(id);
    }
  }
}

/**
 * 根据模板添加 form 数据集
 * 内部函数，被setViews调用
 * @param {*} n 模板名称
 * @param {*} v 数据对象
 */
function addSet(n, v) {
  try {
    const el = this;
    const tp = el.name(`${n}-tp`);
    if (tp.length) {
      tp.hide();
      const p = tp.clone();
      p.insertBefore(tp);
      Object.keys(v).forEach(k => {
        setView.bind(p)(v[k], k);
      });
      p.attr('name', tp.attr('name').replace('-tp', '-data')).show();
    }
  } catch (ex) {
    console.error('addSet exp.', {msg: ex.message});
  }
}

/**
 * 渲染模板字符串，使用 r 参数，替换模板代参，生成展示html视图
 * 替代 eval，减少安全漏洞，eval 会带入了所有内存上下文变量，导致数据泄露！
 * @param {*} tp 模板
 * @param {*} r 数据
 * @returns 返回html
 */
function render(tp, r) {
  const code = `function(r){return \`${tp}\`}`;
  // eslint-disable-next-line no-new-func
  return Function(`"use strict";return (${code})`)()(r);
}

/**
 * 根据模板，添加数据节点
 * 添加前，根据id 或 _id，删除相同已加载数据节点，避免重复添加
 * 内部函数，被 setData 调用
 * @param {*} tp 模板
 * @param {*} n 字段名称
 * @param {*} r 数据，对象 或 值
 * @param {*} ns 已经存在的数据节点，避免重复添加
 * @param {Number} idx 数组中作为id的序号，从0开始，-1表示没有
 */
function addData(tp, n, r, ns, idx = -1) {
  try {
    if (!tp) return;

    // 对象、数组可能存在id、_id
    const isObj = $.isObject(r);
    const isArr = $.isArray(r);

    let id;
    let _id;
    if (isObj) {
      id = r.id;
      _id = r._id;
    } else if (isArr) {
      if (idx > -1) id = r[idx];
    } // 普通值直接作为_id
    else _id = r;

    // 通过id、_id删除重复节点
    if ((id !== undefined || _id !== undefined) && ns?.length) {
      const ds = ns.filter((i, n) => {
        const $n = $(n);
        return (id && $n.data('id') == id) || (_id && $n.data('_id') == _id);
      });

      if (ds.length) ds.remove();
    }

    // 通过模板与r结合，生成页面html
    const $n = $(
      render(tp.dom.outerHTML, r)
        .replaceAll('undefined:', '')
        .replaceAll('undefined：', '')
        .replaceAll('undefined', '')
    );
    if (id !== undefined) $n.data('id', id);
    else if (_id !== undefined) $n.data('_id', _id);
    $n.attr('name', `${n}-data`).insertBefore(tp).show();
  } catch (ex) {
    console.error('addData exp.', {msg: ex.message});
  }
}

/**
 * 视图赋值
 * 优先节点名称表单value赋值：input、hidden、select、checkbox、radio、textarea
 * 然后继续对模板继续赋值：-tp、-val 和内部包含 ${ 模板特殊字符串的视图赋值！
 * 使用-tp模板或name的html作为模版，xxx-val 不判断 ${直接覆盖，
 * xxx 判断内部是否有 ${，如果有，则视为模板，进行模板替换。
 * 加载数据到页面，模板请使用 ${r} 或 ${r.xx}
 * img 的 $src 改为 src
 * 内部函数，被 setField 调用，只管模板，不管input 和 form
 * 在非 form 和 input环境可用
 * @param {*} n 模板名称，组件name="n-tp"，n为模板名称
 * @param {*} v 数据，对象或者对象数组
 * @param {Numver} idx 指定数组id列序号，v 为数组时有效
 */
function setData(n, v, idx = -1) {
  try {
    if (!n) return false;

    const el = this; // 容器

    // 查找名称节点
    const $d = el.name(n); // 包含容器自身

    // 名称节点赋值优先！
    // 容器内查找字段名称对应组件进行赋值，支持select、radio、checkbox，Dom的val已经支持，这里可直接调用val即可！
    if ($d.length > 0) {
      const d = $d.dom;
      // console.log('setView', {type: d.type});
      // null undfined 转换为空
      v = v ?? '';
      if (v === 'null' || v === 'undefined') v = '';

      if (d.tagName.toLowerCase() === 'textarea') $d.val(v);
      // input 赋值
      else if (d.tagName.toLowerCase() === 'input') {
        if (d.type === 'text') setInput.bind(el)(n, v);
        else if (
          [
            'date',
            'time',
            'month',
            'week',
            'datetime',
            'datetime-local',
            'email',
            'number',
            'search',
            'url',
          ].includes(d.type)
        )
          $d.val(v);
        // 隐藏域，一般带同名模板，数据为数组或对象，不使用隐藏域也可以展示对象数据，使用隐藏域便于收集数据提交
        else if (d.type === 'hidden') {
          setInput.bind(el)(n, v);
          // setData.bind(el)(n, v); // 后续继续执行模板部分！
          // 触发 input的 onchange 事件，hidden 组件数据变化，不会触发onchange
          // 这里发起change事件，方便其他组件接收事件后，实现UI等处理
          // 其他接受change事件的组件，不能再次触发change，否则导致死循环
          $d.change();
        } else if (
          d.type === 'select-one' ||
          d.type === 'select-multiple' ||
          d.type === 'checkbox' ||
          d.type === 'radio'
        ) {
          $d.val(v, el);
        }
      }
    }

    // 继续${} 模板字符串替换赋值：-tp、-val、和内部包含${特征字符串的内容赋值
    if ($.isEmpty(v)) return false;

    // 查找数据模板，按模板增加数据，模板优先 name
    const tp = el.name(`${n}-tp`);
    // 有模板，使用模板添加数据，通过id或_id避免重复添加
    if (tp.length) {
      tp.hide();
      let kv = false; // key value
      const tpa = tp.attr('tp');
      if (tpa === 'kv' || /kv-\d+/.test(tpa)) kv = true;
      let empty = el.names(`${n}-data`).length === 0;
      // chip
      const d = el.name(n).dom;
      // 如果 input存在，优先获取 input 中的 data
      if (d && d.type === 'hidden') {
        const val = d.value;
        if (!$.isEmpty(d.data)) v = d.data;
        else if (val) {
          v = val;
          if (val.indexOf(',') > -1) v = val.split(',');
        }
      }

      // 已经存在的数据视图，新增时，需删除后新增，避免重复
      const ns = el.names(`${n}-data`);

      // 数组，两维数组，对象数组
      if ($.isArray(v))
        v.forEach((r, x) => {
          if (r) {
            empty = false;
            addData.bind(el)(tp, n, r, ns, idx); // 二维数组，模板中通过 r[0] r[1] 引用数据
          }
        });
      else if ($.isObject(v) && kv) {
        const ks = Object.keys(v);
        if (ks.length) {
          empty = false;
          const ms = /kv-(\d+)/.exec(tpa);
          if (!ms) {
            ks.forEach(vk => {
              if (v[vk]) {
                addData.bind(el)(tp, n, {k: vk, v: v[vk]}, ns, idx);
              }
            });
          } else {
            const kn = ms[1];
            let ik = 0;
            // 取模存值
            const mks = [];
            const mvs = [];
            let m = 0;
            ks.forEach(vk => {
              ik++;
              mks.push(vk);
              mvs.push(v[vk] ?? '');

              // 取模
              m = ik % kn;
              // id >= kn
              if (m === 0) {
                const md = {};
                mks.forEach((mk, mi) => {
                  md[`k${mi + 1}`] = mks[mi];
                  md[`v${mi + 1}`] = mvs[mi];
                });
                console.log('setData', {md});
                addData.bind(el)(tp, n, md, ns, idx);
                mks.length = 0;
                mvs.length = 0;
              }
            });

            if (m > 0) {
              const md = {};
              mks.forEach((mk, mi) => {
                md[`k${mi + 1}`] = mks[mi];
                md[`v${mi + 1}`] = mvs[mi];
              });
              console.log('setData', {md});
              addData.bind(el)(tp, n, md, ns, idx);
              mks.length = 0;
              mvs.length = 0;
            }
          }
        }
      } else if (v) {
        empty = false;
        addData.bind(el)(tp, n, v, ns, idx);
      }

      // 父元素上侦听，点击删除
      if (tp.hasClass('chip')) {
        const p = tp.parentNode();
        p.off('click', removeChip);
        p.click(removeChip);
      }

      // img src-tp replace src
      const imgs = tp.find('img[src-tp]');
      el.find('img[src-tp]').forEach(img => {
        if (imgs.length === 0 || imgs.indexOf(img) === -1) {
          const $img = $(img);
          $img.attr('src', $img.attr('src-tp'));
          $img.removeAttr('src-tp');
        }
      });

      // 如果数据节点为空，则显示空节点（存在则显示）
      if (empty) el.name(`${n}-empty`).show();
      else el.name(`${n}-empty`).hide();
    } else {
      // 没有-tp模板，查找-val，直接覆盖
      const r = v;
      const vp = el.name(`${n}-val`);
      if (vp.length) {
        const tx = vp.html();
        if (r && tx.indexOf('${') > -1) {
          vp.html(
            render(tx, r)
              .replaceAll('undefined:', '')
              .replaceAll('undefined：', '')
              .replaceAll('undefined', '')
          );
          // img $src replace src
          vp.find('img[src-tp]').forEach(n => {
            const $n = $(n);
            $n.attr('src', $n.attr('src-tp'));
          });
        } else if (r) vp.html(r);
      } else {
        // 没有-tp和-val，获取name为k的视图，如果内部有${，按模板覆盖内容
        // const $d = el.name(`${n}`);
        if ($d.length && $d.dom.type !== 'text') {
          const tx = $d.html();
          if (r && tx?.indexOf('${') > -1) {
            $d.html(
              render(tx, r)
                .replaceAll('undefined:', '')
                .replaceAll('undefined：', '')
                .replaceAll('undefined', '')
            );
            // img $src replace src
            $d.find('img[src-tp]').forEach(img => {
              const $img = $(img);
              $img.attr('src', $img.attr('src-tp'));
            });
          }
        }
      }
    }
  } catch (ex) {
    console.error('setData exp.', {msg: ex.message});
  }
}

/**
 * input 赋值时设置数据，自动去重
 * 内部函数，被 setInput调用
 * @param {*} n input Dom 实例
 * @param {*} v 值
 * @param {*} org 原来的值
 */
function getValue(n, v, org) {
  let R = v;

  try {
    // 对象需判断是否重复
    if ($.isObject(v)) {
      if ($.isObject(org)) {
        if ((org.id && org.id == v.id) || (org._id && org._id == v._id)) R = v;
        else R = [org, v];
      } else if ($.isArray(org)) {
        const rs = org.filter(
          o => (!o.id && !o._id) || (o.id && o.id != v.id) || (o._id && o._id != v._id)
        );
        if (rs.length) {
          rs.push(v);
          R = rs;
        }
      }
    } else {
      // 值变量，直接使用 value 字符串方式存储
      let val = `${org},${v}`;
      // 去重
      if (val.indexOf(',') > -1) val = Array.from(new Set(val.split(','))).join(',');
      R = val;
    }
  } catch (e) {
    console.error('getValue exp.', {msg: e.message});
  }
  return R;
}

/**
 * 设置 input 的值
 * 如果带id，则检查是否已存在，避免重复添加
 * @param {*} n 字段名称
 * @param {*} v 值，接受字符串、对象 和 对象数组
 * 对象、对象数组 赋值到 data，值，值数组，赋值到 value
 */
function setInput(n, v) {
  try {
    const el = this;
    const d = el.name(n);
    if (!d.length) return;

    if ($.isEmpty(v)) return;

    // 没有id 和 _id，自动添加 _id，避免重复添加
    if ($.isObject(v) && v.id === undefined && v._id === undefined) v._id = $.num();
    else if ($.isArray(v)) {
      v.forEach(r => {
        if ($.isObject(r) && r.id === undefined && r._id === undefined) r._id = $.num();
      });
    }

    let org = d.dom.data;
    if (!org) {
      org = d.val();
      // 隐藏域，从字符串还原对象，保存到 dom.data
      if (d.dom.type === 'hidden' && /\s*[{[]/g.test(org)) {
        try {
          org = JSON.parse(org);
          d.dom.data = org;
          d.val('');
        } catch (e) {
          console.error('setInput exp.', {msg: e.message});
        }
      }
    }

    if ($.isEmpty(org)) {
      if ($.isVal(v)) d.val(v);
      else if ($.isArray(v) && $.isVal(v[0])) d.val(v.join(','));
      else d.dom.data = v;
    } else {
      if ($.isArray(v)) {
        v = v.reduce((pre, cur) => getValue(d, cur, pre), org);
        if ($.hasVal(v) && $.isArray(v)) {
          v = Array.from(new Set(v));
        }
      } else v = getValue(d, v, org);

      if ($.hasVal(v)) {
        if ($.isVal(v)) d.val(v);
        // 值 数组
        else if ($.isArray(v) && $.isVal(v[0])) d.val(v.join(','));
        else d.dom.data = v;
      }
    }
  } catch (ex) {
    console.error('setInput exp.', {msg: ex.message});
  }
}

// test
// Object.keys(fn).forEach(k => ($.fn[k] = fn[k]));

const View = /*#__PURE__*/Object.freeze({
  __proto__: null,
  addView: addView,
  addViews: addViews,
  clearForm: clearForm,
  clearView: clearView,
  getForm: getForm,
  getView: getView,
  setForm: setForm,
  setView: setView,
  setViews: setViews
});

/**
 * 输出方法到 $.fn，用户对 $(dom) 对象操作
 * 相关方法与用法与 zepto、jQuery兼容。
 * 替代zepto、jQuery，不可同时使用zepto、jQuery
 */


// 获取当前全局$变量，$.fn 上增加操作函数！
const $$1 = window.$ ?? {};
[Methods, Scroll, Animate, View].forEach(group => {
  // , eventShortcuts
  Object.keys(group).forEach(methodName => {
    $$1.fn[methodName] = group[methodName];
  });
});

// shortcut methods for `.on(event, fn)` for each event type
const noTrigger = 'resize scroll'.split(' ');
(
  'load,unload,dblclick,select,error,click,blur,focus,focusin,' +
  'focusout,keyup,keydown,keypress,submit,change,mousedown,mousemove,mouseup,' +
  'mouseenter,mouseleave,mouseout,mouseover,touchstart,touchend,touchmove,resize,' +
  'scroll,swipe,press'
)
  .split(',')
  .forEach(function (event) {
    $$1.fn[event] = function (...args) {
      if (typeof args[0] === 'undefined') {
        for (let i = 0; i < this.length; i += 1) {
          try {
            if (noTrigger.indexOf(event) < 0) {
              if (event in this[i]) this[i][event]();
              else {
                $$1(this[i]).trigger(event);
              }
            }
          } catch (ex) {}
        }
        return this;
      }
      return this.on(event, ...args);
    };
  });

function traverseNode(node, fun) {
  fun(node);
  for (var i = 0, len = node.childNodes.length; i < len; i++) traverseNode(node.childNodes[i], fun);
}

// Generate the `after`, `prepend`, `before`, `append`,
// `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
const operators = ['after', 'prepend', 'before', 'append'];
operators.forEach(function (op, idx) {
  var inside = idx % 2; //=> prepend, append
  $$1.fn[op] = function () {
    // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
    let argType;
    // map 每个参数，支持添加多个节点
    const nodes = $$1.map(arguments, function (arg) {
      var arr = [];
      argType = $$1.type(arg);
      if (argType == 'array') {
        arg.forEach(function (el) {
          if (el.nodeType !== undefined) return arr.push(el);
          else if ($$1.isDom(el)) return (arr = arr.concat(el.get()));
          arr = arr.concat($$1.fragment(el));
        });
        return arr;
      }
      return argType == 'object' || arg == null ? arg : $$1.fragment(arg);
    });

    if (nodes.length < 1) return this;

    let parent;
    // 多目标节点增加新节点时，需克隆，否则只有最后一个目标节点增加了新节点
    let copyByClone = this.length > 1;

    // 针对每个节点进行节点添加操作
    return this.each(function (_, target) {
      parent = inside ? target : target.parentNode;

      // convert all methods to a "before" operation
      target =
        idx == 0
          ? target.nextSibling // after
          : idx == 1
          ? target.firstChild // prepend
          : idx == 2
          ? target // before
          : null; // append

      var parentInDoc = $$1.contains(document.documentElement, parent);

      nodes.forEach(function (node) {
        if (copyByClone) node = node.cloneNode(true);
        else if (!parent) return $$1(node).remove();

        parent.insertBefore(node, target);

        // 防止空链接，刷新页面
        const ns = $$1.qus('a[href=""]', parent);
        if (ns && ns.length > 0) ns.forEach(n => n.setAttribute('href', 'javascript:;'));

        if (parentInDoc)
          // 执行 节点中包含的脚本代码
          traverseNode(node, function (el) {
            if (
              el.nodeName != null &&
              el.nodeName.toUpperCase() === 'SCRIPT' &&
              (!el.type || el.type === 'text/javascript') &&
              !el.src
            ) {
              var target = el.ownerDocument ? el.ownerDocument.defaultView : window;
              target['eval'].call(target, el.innerHTML);
            }
          });
      });
    });
  };

  // 参数调换，参数作为目标节点，this作为新增节点
  // after    => insertAfter
  // prepend  => prependTo
  // before   => insertBefore
  // append   => appendTo
  const op2 = inside ? op + 'To' : 'insert' + (idx ? 'Before' : 'After');
  $$1.fn[op2] = function (html) {
    $$1(html)[op](this);
    return this;
  };
});

$$1.default = $$1;
// export {$};

module.exports = $$1;
