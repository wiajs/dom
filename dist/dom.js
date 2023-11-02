/*!
  * wia dom v1.0.10
  * (c) 2015-2023 Sibyl Yu and contributors
  * Released under the MIT License.
  */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.$ = factory());
})(this, (function () { 'use strict';

  var emptyArray = [];
  var elementDisplay = {};
  var rootNodeRE = /^(?:body|html)$/i;
  var propMap = {
    tabindex: 'tabIndex',
    readonly: 'readOnly',
    "for": 'htmlFor',
    "class": 'className',
    maxlength: 'maxLength',
    cellspacing: 'cellSpacing',
    cellpadding: 'cellPadding',
    rowspan: 'rowSpan',
    colspan: 'colSpan',
    usemap: 'useMap',
    frameborder: 'frameBorder',
    contenteditable: 'contentEditable'
  };
  function concat() {
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      var v = i < 0 || arguments.length <= i ? undefined : arguments[i];
      args[i] = $.isDom(v) ? v.toArray() : v;
    }
    return emptyArray.concat.apply($.isDom(this) ? this.toArray() : this, args);
  }
  function ready(cb) {
    if (/complete|loaded|interactive/.test(document.readyState) && document.body) cb($);else document.addEventListener('DOMContentLoaded', function () {
      cb($);
    }, false);
    return this;
  }
  function get(idx) {
    return idx === undefined ? emptyArray.slice.call(this) : this[idx >= 0 ? idx : idx + this.length];
  }
  function toArray() {
    return this.get();
  }
  function size() {
    return this.length;
  }
  function setAttr(node, n, value) {
    if (node && node.nodeType === 1) {
      if (value == null) node.removeAttribute(n);else node.setAttribute(n, value);
    }
  }
  function attr(n, value) {
    var R;
    var el = this[0];
    if (arguments.length === 1 && typeof n === 'string') {
      if (el.nodeType === 1 && el) R = el.getAttribute(n);
    } else {
      R = this.each(function (idx) {
        var _this = this;
        if ($.isObject(n)) {
          Object.keys(n).forEach(function (k) {
            _this[k] = n[k];
            setAttr(_this, k, n[k]);
          });
        } else setAttr(this, n, $.funcArg(this, value, idx, this.getAttribute(n)));
      });
    }
    return R;
  }
  function removeAttr(n) {
    return this.each(function () {
      this.nodeType === 1 && n.split(' ').forEach(function (v) {
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
      if (arguments.length === 1 && typeof n === 'string') this[0] && this[0][n];else {
        return this.each(function (idx) {
          if (arguments.length === 2) this[n] = $.funcArg(this, value, idx, this[n]);else if ($.isObject(n)) {
            for (var _prop in n) {
              this[_prop] = n[_prop];
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
  function data(key, value) {
    var R;
    var el;
    var attrName = 'data-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
    if (typeof value === 'undefined') {
      el = this[0];
      if (el) {
        if (el.domElementDataStorage && key in el.domElementDataStorage) {
          R = el.domElementDataStorage[key];
        } else R = this.attr(attrName);
      }
      if (R) R = $.deserializeValue(R);
    } else {
      for (var i = 0; i < this.length; i += 1) {
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
    var attrName = 'data-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
    for (var i = 0; i < this.length; i += 1) {
      var el = this[i];
      if (el.domElementDataStorage && el.domElementDataStorage[key]) {
        el.domElementDataStorage[key] = null;
        delete el.domElementDataStorage[key];
      }
      el.removeAttribute(attrName);
    }
    return this;
  }
  function dataset() {
    var el = this[0];
    if (!el) return undefined;
    var dataset = {};
    if (el.dataset) {
      for (var dataKey in el.dataset) {
        dataset[dataKey] = el.dataset[dataKey];
      }
    } else {
      for (var i = 0; i < el.attributes.length; i += 1) {
        var _attr = el.attributes[i];
        if (_attr.name.indexOf('data-') >= 0) {
          dataset[$.camelCase(_attr.name.split('data-')[1])] = _attr.value;
        }
      }
    }
    for (var key in dataset) dataset[key] = $.deserializeValue(dataset[key]);
    return dataset;
  }
  function val(value, el) {
    var R;
    if (0 in arguments && !$.isDom(value)) {
      if (value == null) value = '';
      return this.each(function (idx) {
        var vs = $.funcArg(this, value, idx, this.value);
        var dom = this;
        if (dom.multiple && dom.nodeName.toLowerCase() === 'select') {
          if (Array.isArray(vs)) vs = vs.map(function (v) {
            return v.toString();
          });else vs = [vs.toString()];
          dom.options.forEach(function (o) {
            return o.selected = vs.includes(o.value);
          });
        } else if (dom.type === 'checkbox' && el) {
          if (Array.isArray(vs)) vs = vs.map(function (v) {
            return v.toString();
          });else vs = [vs.toString()];
          var _name = $(dom).attr('name');
          var ns = $("input[name=" + _name + "]", el);
          ns.forEach(function (n) {
            return n.checked = vs.includes(n.value);
          });
        } else if (dom.type === 'radio' && el) {
          if (Array.isArray(vs)) vs = vs[0];
          var _name2 = $(dom).attr('name');
          var _ns = $("input[name=" + _name2 + "]", el);
          _ns.forEach(function (n) {
            n.checked = n.value === vs.toString();
          });
        } else dom.value = vs.toString();
      });
    } else if (this[0]) {
      var dom = this[0];
      R = dom.value;
      if (dom.multiple && dom.nodeName.toLowerCase() === 'select') R = $(dom).find('option').filter(function () {
        return this.selected;
      }).pluck('value');else if (dom.type === 'checkbox' && $.isDom(value)) {
        var _el = value;
        var _name3 = this.attr('name');
        var ns = $("input[name=" + _name3 + "]:checked", _el);
        R = ns.pluck('value');
      } else if (dom.type === 'radio' && $.isDom(value)) {
        var _el2 = value;
        var _name4 = this.attr('name');
        var n = $("input[name=" + _name4 + "]:checked", _el2);
        if (n && n.length) R = n[0].value;
      }
    }
    return R;
  }
  function transform(transform) {
    for (var i = 0; i < this.length; i += 1) {
      var elStyle = this[i].style;
      elStyle.webkitTransform = transform;
      elStyle.transform = transform;
    }
    return this;
  }
  function transition(duration) {
    if (typeof duration !== 'string') {
      duration = duration + "ms";
    }
    for (var i = 0; i < this.length; i += 1) {
      var elStyle = this[i].style;
      elStyle.webkitTransitionDuration = duration;
      elStyle.transitionDuration = duration;
    }
    return this;
  }
  function on() {
    var _this2 = this;
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    var eventType = args[0],
      targetSelector = args[1],
      listener = args[2],
      capture = args[3];
    if (typeof args[1] === 'function') {
      eventType = args[0];
      listener = args[1];
      capture = args[2];
      targetSelector = undefined;
    }
    function liveHandler(ev, sender) {
      var _$$closest;
      var n = ev.target;
      if (!n) return;
      var evType = liveHandler.eventType,
        selector = liveHandler.selector,
        fn = liveHandler.liveProxy;
      var el = (_$$closest = $(n).closest(selector)) == null ? void 0 : _$$closest.dom;
      if (el && (evType !== 'click' || canClick(el, fn))) {
        for (var _len2 = arguments.length, vs = new Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
          vs[_key2 - 2] = arguments[_key2];
        }
        var param = [ev, el].concat(vs);
        fn.apply(el, param);
      }
    }
    if (targetSelector) {
      liveHandler.selector = targetSelector;
      liveHandler.liveProxy = listener;
      liveHandler.eventType = eventType;
      return this.on(eventType, liveHandler, capture);
    }
    if (!capture) capture = false;
    function handleEvent(ev) {
      var _ev$target$wiaDomEven, _ev$target;
      var ds = (_ev$target$wiaDomEven = ev == null ? void 0 : (_ev$target = ev.target) == null ? void 0 : _ev$target.wiaDomEventData) != null ? _ev$target$wiaDomEven : [];
      for (var _len3 = arguments.length, vs = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        vs[_key3 - 1] = arguments[_key3];
      }
      var param = [ev, this].concat(vs, ds);
      listener.apply(this, param);
    }
    function canClick(el, fn) {
      var R = true;
      if (!el || !fn) return false;
      if (fn.liveProxy || fn.onceProxy || el.nodeType !== 1) return true;
      try {
        var _el$clickDisabled;
        if ((_el$clickDisabled = el.clickDisabled) != null && _el$clickDisabled.has != null && _el$clickDisabled.has(fn)) {
          console.log('duplicate click disabled.');
          R = false;
        } else {
          if (!el.clickDisabled) el.clickDisabled = new Set();
          el.clickDisabled.add(fn);
          setTimeout(function () {
            return el.clickDisabled["delete"](fn);
          }, 200);
        }
      } catch (ex) {
        console.log('canClick exp:', ex.message);
      }
      return R;
    }
    function clickEvent(ev) {
      var _ev$target2;
      var el = this;
      if (!canClick(el, listener)) return false;
      var ds = (ev == null ? void 0 : (_ev$target2 = ev.target) == null ? void 0 : _ev$target2.wiaDomEventData) || [];
      var param = [ev, this].concat(ds);
      listener.apply(this, param);
    }
    var touch = {};
    function touchStart(ev) {
      var _touch$el$rect$top, _touch$el$rect, _touch$el$rect$left, _touch$el$rect2;
      touch.x = ev.targetTouches[0].pageX;
      touch.y = ev.targetTouches[0].pageY;
      touch.el = $(ev.target);
      touch.top = (_touch$el$rect$top = (_touch$el$rect = touch.el.rect()) == null ? void 0 : _touch$el$rect.top) != null ? _touch$el$rect$top : 0;
      touch.left = (_touch$el$rect$left = (_touch$el$rect2 = touch.el.rect()) == null ? void 0 : _touch$el$rect2.left) != null ? _touch$el$rect$left : 0;
      touch.time = new Date().getTime();
      touch.trigger = false;
      touch.scrollY = false;
      var pg = touch.el.closest('.page-content').dom;
      if (pg) {
        touch.scrollY = true;
        if (pg.scrollTop === 0 || pg.scrollTop + pg.clientHeight === pg.scrollHeight) touch.scrollY = false;
      }
    }
    function touchMove(ev) {
      var _touch$el$rect$top2, _touch$el$rect3, _touch$el$rect$left2, _touch$el$rect4;
      if (eventType !== 'swipe' || touch.trigger) return;
      var x = Math.round(ev.targetTouches[0].pageX - touch.x);
      var y = Math.round(ev.targetTouches[0].pageY - touch.y);
      var top = Math.round(((_touch$el$rect$top2 = (_touch$el$rect3 = touch.el.rect()) == null ? void 0 : _touch$el$rect3.top) != null ? _touch$el$rect$top2 : 0) - touch.top);
      var left = Math.round(((_touch$el$rect$left2 = (_touch$el$rect4 = touch.el.rect()) == null ? void 0 : _touch$el$rect4.left) != null ? _touch$el$rect$left2 : 0) - touch.left);
      var mx = Math.abs(x - left);
      var my = Math.abs(y - top);
      if (my > 15 && mx < 8 && top === 0 && !touch.scrollY) {
        touch.trigger = true;
        return handleEvent.call(this, ev, {
          x: 0,
          y: y
        });
      }
      if (mx > 12 && my < 8 && left === 0 && top === 0) {
        touch.trigger = true;
        return handleEvent.call(this, ev, {
          x: x,
          y: 0
        });
      }
    }
    function clickEnd(ev) {
      return touchEnd.call(this, ev);
    }
    function pressEnd(ev) {
      return touchEnd.call(this, ev);
    }
    function touchEnd(ev) {
      if (eventType !== 'click' && eventType !== 'press') return;
      touch.trigger = false;
      var x = Math.abs(ev.changedTouches[0].pageX - touch.x);
      var y = Math.abs(ev.changedTouches[0].pageY - touch.y);
      var tm = new Date().getTime() - touch.time;
      if (x <= 5 && y <= 5) {
        if (tm < 500 && eventType === 'click') return clickEvent.call(this, ev);
        if (tm > 500 && eventType === 'press') return handleEvent.call(this, ev);
      }
    }
    var events = eventType.split(' ');
    var j;
    var _loop = function _loop() {
      var el = _this2[i];
      var _loop2 = function _loop2() {
        var event = events[j];
        if (!el.domListeners) el.domListeners = {};
        if (!el.domListeners[event]) el.domListeners[event] = [];
        if ($.support.touch && (event === 'click' || event === 'swipe' || event === 'press')) {
          var lis = {
            capture: capture,
            listener: listener,
            proxyListener: [touchStart]
          };
          var passive = capture;
          if (event === 'swipe') {
            if ($.support.passiveListener) passive = {
              passive: true,
              capture: capture
            };
            lis.proxyListener.push(touchMove);
          } else if (event === 'click') lis.proxyListener.push(clickEnd);else if (event === 'press') lis.proxyListener.push(pressEnd);
          el.domListeners[event].push(lis);
          lis.proxyListener.forEach(function (fn) {
            var type = '';
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
            el.addEventListener(type, fn, passive);
          });
        } else if (event === 'click') {
          el.domListeners[event].push({
            capture: capture,
            listener: listener,
            proxyListener: clickEvent
          });
          el.addEventListener(event, clickEvent, capture);
        } else {
          el.domListeners[event].push({
            capture: capture,
            listener: listener,
            proxyListener: handleEvent
          });
          el.addEventListener(event, handleEvent, capture);
        }
      };
      for (j = 0; j < events.length; j += 1) {
        _loop2();
      }
    };
    for (var i = 0; i < this.length; i += 1) {
      _loop();
    }
    return this;
  }
  function off() {
    for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }
    var eventType = args[0],
      targetSelector = args[1],
      listener = args[2],
      capture = args[3];
    if (typeof args[1] === 'function') {
      eventType = args[0];
      listener = args[1];
      capture = args[2];
      targetSelector = undefined;
    }
    if (!capture) capture = false;
    var events = eventType.split(' ');
    for (var i = 0; i < events.length; i += 1) {
      var _event = events[i];
      for (var j = 0; j < this.length; j += 1) {
        var _el$domListeners;
        var el = this[j];
        var handlers = el == null ? void 0 : (_el$domListeners = el.domListeners) == null ? void 0 : _el$domListeners[_event];
        if (handlers != null && handlers.length) {
          for (var k = handlers.length - 1; k >= 0; k -= 1) {
            var _handler$listener, _handler$listener2, _handler$listener3, _handler$listener4;
            var handler = handlers[k];
            if ((handler == null ? void 0 : handler.listener) === listener && (handler == null ? void 0 : handler.capture) === capture) {
              if ((_event === 'click' || _event === 'swipe' || _event === 'press') && $.support.touch) {
                el.removeEventListener('touchstart', handler.proxyListener[0], handler.capture);
                if (_event === 'swipe') el.removeEventListener('touchmove', handler.proxyListener[1], handler.capture);else el.removeEventListener('touchend', handler.proxyListener[1], handler.capture);
              } else el.removeEventListener(_event, handler.proxyListener, handler.capture);
              handlers.splice(k, 1);
            } else if (listener && (handler == null ? void 0 : (_handler$listener = handler.listener) == null ? void 0 : _handler$listener.onceProxy) === listener && (handler == null ? void 0 : handler.capture) === capture) {
              el.removeEventListener(_event, handler.proxyListener, handler.capture);
              handlers.splice(k, 1);
            } else if (listener && targetSelector && (handler == null ? void 0 : (_handler$listener2 = handler.listener) == null ? void 0 : _handler$listener2.liveProxy) === listener && (handler == null ? void 0 : (_handler$listener3 = handler.listener) == null ? void 0 : _handler$listener3.selector) === targetSelector && (handler == null ? void 0 : handler.capture) === capture) {
              el.removeEventListener(_event, handler.proxyListener, handler.capture);
              handlers.splice(k, 1);
            } else if (listener && !targetSelector && (handler == null ? void 0 : (_handler$listener4 = handler.listener) == null ? void 0 : _handler$listener4.liveProxy) === listener && (handler == null ? void 0 : handler.capture) === capture) {
              el.removeEventListener(_event, handler.proxyListener, handler.capture);
              handlers.splice(k, 1);
            } else if (!listener) {
              el.removeEventListener(_event, handler.proxyListener, handler.capture);
              handlers.splice(k, 1);
            }
          }
        }
      }
    }
    return this;
  }
  function once() {
    var self = this;
    for (var _len5 = arguments.length, args = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      args[_key5] = arguments[_key5];
    }
    var eventName = args[0],
      targetSelector = args[1],
      listener = args[2],
      capture = args[3];
    if (typeof args[1] === 'function') {
      eventName = args[0];
      listener = args[1];
      capture = args[2];
      targetSelector = undefined;
    }
    function onceHandler() {
      self.off(eventName, targetSelector, onceHandler, capture);
      if (onceHandler.onceProxy) {
        for (var _len6 = arguments.length, eventArgs = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
          eventArgs[_key6] = arguments[_key6];
        }
        onceHandler.onceProxy.apply(this, eventArgs);
        delete onceHandler.onceProxy;
      }
    }
    onceHandler.onceProxy = listener;
    return self.on(eventName, targetSelector, onceHandler, capture);
  }
  function trigger() {
    for (var _len7 = arguments.length, args = new Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
      args[_key7] = arguments[_key7];
    }
    var events = args[0].split(' ');
    var eventData = args[1];
    for (var i = 0; i < events.length; i += 1) {
      var _event2 = events[i];
      for (var j = 0; j < this.length; j += 1) {
        var el = this[j];
        var evt = void 0;
        try {
          evt = new window.CustomEvent(_event2, {
            detail: eventData,
            bubbles: true,
            cancelable: true
          });
        } catch (e) {
          evt = document.createEvent('Event');
          evt.initEvent(_event2, true, true);
          evt.detail = eventData;
        }
        el.wiaDomEventData = args.filter(function (data, dataIndex) {
          return dataIndex > 0;
        });
        el.dispatchEvent(evt);
        el.wiaDomEventData = [];
        delete el.wiaDomEventData;
      }
    }
    return this;
  }
  function transitionEnd(callback) {
    var events = ['webkitTransitionEnd', 'transitionend'];
    var dom = this;
    var i;
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
  function animationEnd(callback) {
    var events = ['webkitAnimationEnd', 'animationend'];
    var dom = this;
    var i;
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
        var _styles = this.styles();
        return this[0].offsetWidth + parseFloat(_styles.getPropertyValue('margin-right')) + parseFloat(_styles.getPropertyValue('margin-left'));
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
        var _styles2 = this.styles();
        return this[0].offsetHeight + parseFloat(_styles2.getPropertyValue('margin-top')) + parseFloat(_styles2.getPropertyValue('margin-bottom'));
      }
      return this[0].offsetHeight;
    }
    return null;
  }
  function offset(coordinates) {
    if (coordinates) return this.each(function (idx) {
      var $this = $(this),
        coords = $.funcArg(this, coordinates, idx, $this.offset()),
        parentOffset = $this.offsetParent().offset(),
        props = {
          top: coords.top - parentOffset.top,
          left: coords.left - parentOffset.left
        };
      if ($this.css('position') === 'static') props.position = 'relative';
      $this.css(props);
    });
    if (!this.length) return null;
    if (document.documentElement !== this[0] && !$.contains(document.documentElement, this[0])) return {
      top: 0,
      left: 0
    };
    var obj = this[0].getBoundingClientRect();
    var pg = this.closest('.page-content');
    var scrollX = pg.length ? pg.dom.scrollLeft : window.pageXOffset;
    var scrollY = pg.length ? pg.dom.scrollTop : window.pageYOffset;
    return {
      left: obj.left + scrollX,
      top: obj.top + scrollY,
      width: Math.round(obj.width),
      height: Math.round(obj.height)
    };
  }
  function rect() {
    if (!this.length) return null;
    if (document.documentElement !== this[0] && !$.contains(document.documentElement, this[0])) return {
      top: 0,
      left: 0
    };
    var obj = this[0].getBoundingClientRect();
    return {
      left: obj.left,
      top: obj.top,
      width: Math.round(obj.width),
      height: Math.round(obj.height)
    };
  }
  function position() {
    if (!this.length) return;
    var elem = this[0],
      offsetParent = this.offsetParent(),
      offset = this.offset(),
      parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? {
        top: 0,
        left: 0
      } : offsetParent.offset();
    offset.top -= parseFloat($(elem).css('margin-top')) || 0;
    offset.left -= parseFloat($(elem).css('margin-left')) || 0;
    parentOffset.top += parseFloat($(offsetParent[0]).css('border-top-width')) || 0;
    parentOffset.left += parseFloat($(offsetParent[0]).css('border-left-width')) || 0;
    return {
      top: offset.top - parentOffset.top,
      left: offset.left - parentOffset.left
    };
  }
  function offsetParent() {
    return this.map(function () {
      var pt = this.offsetParent || document.body;
      while (pt && !rootNodeRE.test(pt.nodeName) && $(pt).css('position') == 'static') pt = pt.offsetParent;
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
      var el = document.createElement(nodeName);
      document.body.appendChild(el);
      var display = getComputedStyle(el, '').getPropertyValue('display');
      el.parentNode.removeChild(el);
      display === 'none' && (display = 'block');
      elementDisplay[nodeName] = display;
    }
    return elementDisplay[nodeName];
  }
  function show() {
    return this.each(function () {
      this.style.display === 'none' && (this.style.display = '');
      if (getComputedStyle(this, '').getPropertyValue('display') === 'none') this.style.display = defaultDisplay(this.nodeName);
    });
  }
  function replaceWith(newContent) {
    return this.before(newContent).remove();
  }
  function styles() {
    if (this[0]) return window.getComputedStyle(this[0], null);
    return {};
  }
  function css(props, value) {
    var REGEXP_SUFFIX = /^width|height|left|top|marginLeft|marginTop|paddingLeft|paddingTop$/;
    var i;
    if (arguments.length === 1) {
      if (typeof props === 'string') {
        if (this[0]) return window.getComputedStyle(this[0], null).getPropertyValue(props);
      } else {
        for (i = 0; i < this.length; i += 1) {
          for (var _prop2 in props) {
            var v = props[_prop2];
            if (REGEXP_SUFFIX.test(_prop2) && $.isNumber(v)) v = v + "px";
            this[i].style[_prop2] = v;
          }
        }
        return this;
      }
    }
    if (arguments.length === 2 && typeof props === 'string') {
      for (i = 0; i < this.length; i += 1) {
        var _v = value;
        if (REGEXP_SUFFIX.test(props) && $.isNumber(_v)) _v = _v + "px";
        this[i].style[props] = _v;
      }
      return this;
    }
    return this;
  }
  function each(callback) {
    emptyArray.some.call(this, function (el, idx) {
      return callback.call(el, idx, el) === false;
    });
    return this;
  }
  function forEach(callback) {
    emptyArray.some.call(this, function (el, idx) {
      return callback.call(el, el, idx) === false;
    });
    return this;
  }
  function some(callback) {
    return emptyArray.some.call(this, function (el, idx) {
      return callback.call(el, el, idx);
    });
  }
  function every(callback) {
    return emptyArray.every.call(this, function (el, idx) {
      return callback.call(el, el, idx);
    });
  }
  function not(sel) {
    var R = [];
    if ($.isFunction(sel) && sel.call) this.each(function (id) {
      if (!sel.call(this, id)) R.push(this);
    });else {
      var excludes = typeof sel == 'string' ? this.filter(sel) : likeArray(sel) && isFunction(sel.item) ? emptyArray.slice.call(sel) : $(sel);
      this.forEach(function (el) {
        if (excludes.indexOf(el) < 0) R.push(el);
      });
    }
    return $(R);
  }
  function filter(sel) {
    var R = [];
    try {
      if ($.isFunction(sel) && sel.call) {
        this.each(function (id, it) {
          if (sel.call(this, id, it)) R.push(this);
        });
      } else R = emptyArray.filter.call(this, function (el) {
        return $.matches(el, sel);
      });
    } catch (e) {}
    return $(R);
  }
  function map(cb) {
    return $($.map(this, function (el, i) {
      return cb.call(el, i, el);
    }));
  }
  function clone() {
    return this.map(function () {
      return this.cloneNode(true);
    });
  }
  function html(v) {
    return 0 in arguments ? this.each(function (idx) {
      var originHtml = this.innerHTML;
      $(this).empty().append($.funcArg(this, v, idx, originHtml));
    }) : 0 in this ? this[0].innerHTML : undefined;
  }
  function pluck(p) {
    return $.map(this, function (el) {
      return el[p];
    });
  }
  function text(tx) {
    return 0 in arguments ? this.each(function (idx) {
      var newText = $.funcArg(this, tx, idx, this.textContent);
      this.textContent = newText == null ? '' : '' + newText;
    }) : 0 in this ? this.pluck('textContent').join('') : undefined;
  }
  function is(sel) {
    return this.length > 0 && $.matches(this[0], sel);
  }
  function indexOf(el) {
    for (var i = 0; i < this.length; i += 1) {
      if (this[i] === el) return i;
    }
    return -1;
  }
  function index() {
    var chd = this[0];
    var i;
    if (chd) {
      i = 0;
      while ((chd = chd.previousSibling) !== null) {
        if (chd.nodeType === 1) i += 1;
      }
      return i;
    }
    return undefined;
  }
  function slice() {
    for (var _len8 = arguments.length, args = new Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
      args[_key8] = arguments[_key8];
    }
    return $(emptyArray.slice.apply(this, args));
  }
  function eq(idx) {
    if (typeof idx === 'undefined') return this;
    var length = this.length;
    if (idx > length - 1 || length + idx < 0) {
      return $();
    }
    return idx === -1 ? this.slice(idx) : this.slice(idx, +idx + 1);
  }
  function first() {
    var el = this[0];
    return el && !$.isObject(el) ? el : $(el);
  }
  function last() {
    var el = this[this.length - 1];
    return el && !$.isObject(el) ? el : $(el);
  }
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
  function nextNode(selector) {
    var nextEls = [];
    var el = this[0];
    if (!el) return $();
    var next = el.nextElementSibling;
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
  function nextAll(selector) {
    var nextEls = [];
    var el = this[0];
    if (!el) return $();
    while (el.nextElementSibling) {
      var _next = el.nextElementSibling;
      if (selector) {
        if ($(_next).is(selector)) nextEls.push(_next);
      } else nextEls.push(_next);
      el = _next;
    }
    return $(nextEls);
  }
  function prev(selector) {
    if (this.length > 0) {
      var el = this[0];
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
  function prevNode(selector) {
    var prevEls = [];
    var el = this[0];
    if (!el) return $();
    var prev = el.previousElementSibling;
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
  function prevAll(selector) {
    var prevEls = [];
    var el = this[0];
    if (!el) return $();
    while (el.previousElementSibling) {
      var _prev = el.previousElementSibling;
      if (selector) {
        if ($(_prev).is(selector)) prevEls.push(_prev);
      } else prevEls.push(_prev);
      el = _prev;
    }
    return $(prevEls);
  }
  function siblings(selector) {
    return this.nextAll(selector).add(this.prevAll(selector));
  }
  function parent(selector) {
    var parents = [];
    for (var i = 0; i < this.length; i += 1) {
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
  function parents(selector) {
    var parents = [];
    for (var i = 0; i < this.length; i += 1) {
      var _parent = this[i].parentNode;
      while (_parent) {
        if (selector) {
          if ($(_parent).is(selector)) parents.push(_parent);
        } else parents.push(_parent);
        _parent = _parent.parentNode;
      }
    }
    return $($.uniq(parents));
  }
  function parentNode(sel) {
    var R = [];
    for (var i = 0; i < this.length; i += 1) {
      var pn = this[i].parentNode;
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
  function closest(sel) {
    var self = this;
    if (typeof sel === 'undefined') return $();
    if (sel[0] === '~') sel = "[name=" + sel.substr(1) + "]";
    if (!self.is(sel)) {
      for (var i = 0; i < this.length; i += 1) {
        var _parent2 = this[i].parentNode;
        while (_parent2) {
          var d = $(_parent2);
          if (d.is(sel)) return d;
          _parent2 = _parent2.parentNode;
        }
      }
      return $();
    }
    return self;
  }
  function upper(sel) {
    return closest.bind(this)(sel);
  }
  function find(sel) {
    var R = null;
    if (!sel) return $();
    if (sel[0] === '~') sel = "[name=" + sel.substr(1) + "]";
    var self = this;
    if (typeof sel === 'object') R = $(sel).filter(function () {
      var node = this;
      return emptyArray.some.call(self, function (pn) {
        return $.contains(pn, node);
      });
    });else if (this.length === 1) R = $($.qsa(sel, this[0]));else R = this.map(function () {
      return $.qsa(sel, this);
    });
    return R || $();
  }
  function findNode(sel) {
    var R = null;
    if (!sel) return $();
    if (sel[0] === '~') sel = "[name=" + sel.substr(1) + "]";
    if (this.length === 1) R = $($.qu(sel, this[0]));else R = this.map(function () {
      return $.qu(sel, this);
    });
    return R || $();
  }
  function children(sel) {
    var cs = [];
    for (var i = 0; i < this.length; i += 1) {
      var childs = this[i].children;
      for (var j = 0; j < childs.length; j += 1) {
        if (!sel) {
          cs.push(childs[j]);
        } else if ($(childs[j]).is(sel)) cs.push(childs[j]);
      }
    }
    return $($.uniq(cs));
  }
  function childNode(sel) {
    return child.bind(this)(sel);
  }
  function child(sel) {
    if ($.isDom(sel)) {
      this.empty().append(sel);
      return this;
    }
    var cs = [];
    for (var i = 0; i < this.length; i += 1) {
      var childs = this[i].children;
      for (var j = 0; j < childs.length; j += 1) {
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
  function add() {
    var dom = this;
    var i;
    var j;
    for (var _len9 = arguments.length, args = new Array(_len9), _key9 = 0; _key9 < _len9; _key9++) {
      args[_key9] = arguments[_key9];
    }
    for (i = 0; i < args.length; i += 1) {
      var toAdd = $(args[i]);
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
  function hasChild() {
    if (!this.dom) return false;
    return this.dom.children.length > 0;
  }
  function firstChild() {
    if (!this.dom || this.dom.children.length === 0) return null;
    return $([this.dom.children[0]]);
  }
  function lastChild() {
    if (!this.dom || this.dom.children.length === 0) return null;
    return $([this.dom.children[this.dom.children.length - 1]]);
  }
  function childCount() {
    if (!this.dom) return 0;
    return this.dom.children.length;
  }
  function cursorEnd() {
    if (!this.dom) return null;
    var el = this.dom;
    el.focus();
    if (typeof window.getSelection !== 'undefined' && typeof document.createRange !== 'undefined') {
      var rg = document.createRange();
      rg.selectNodeContents(el);
      rg.collapse(false);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(rg);
    } else if (typeof document.body.createTextRangrge !== 'undefined') {
      var _rg = document.body.createTextRange();
      _rg.moveToElementText(el);
      _rg.collapse(false);
      _rg.select();
    }
  }
  function getCursorPos() {
    var R = 0;
    if (!this.dom) return 0;
    var el = this.dom;
    if (el.selectionStart) {
      R = el.selectionStart;
    } else {
      var rg = null;
      if (el.tagName.toLowerCase() === 'textarea') {
        rg = event.srcElement.createTextRange();
        rg.moveToPoint(event.x, event.y);
      } else {
        rg = document.selection.createRange();
      }
      rg.moveStart('character', -event.srcElement.value.length);
      R = rg.text.length;
    }
    return R;
  }
  function getCursorPosition() {
    if (!this.dom) return 0;
    var el = this.dom;
    var qswh = '@#%#^&#*$';
    var rng = document.selection.createRange();
    rng.text = qswh;
    var nPosition = el.value.indexOf(qswh);
    rng.moveStart('character', -qswh.length);
    rng.text = '';
    return nPosition;
  }
  function setCursorPos(pos) {
    if (!this.dom) return;
    var rg = this.dom.createTextRange();
    rg.collapse(true);
    rg.moveStart('character', pos);
    rg.select();
  }
  function moveFirst() {
    this.rowindex = 0;
  }
  function qu(sel) {
    var n = [];
    try {
      var _this$dom;
      n = (_this$dom = this.dom) == null ? void 0 : _this$dom.querySelector(sel);
    } catch (e) {}
    return $(n || []);
  }
  function qus(sel) {
    return $(sel, this.dom);
  }
  function att(n, v) {
    var R = [];
    try {
      var _this$dom2;
      if (this.attr(n) === v) return this;
      R = (_this$dom2 = this.dom) == null ? void 0 : _this$dom2.querySelector("[" + n + "=" + v + "]");
    } catch (e) {}
    return $(R || []);
  }
  function atts(n, v) {
    var R = [];
    try {
      R = $("[" + n + "=" + v + "]", this.dom);
      if (this.attr(n) === v) R.push(this.dom);
    } catch (e) {}
    return $(R || []);
  }
  function name(v) {
    return this.att('name', v);
  }
  function fastLink() {
    $.fastLink(this);
    return this;
  }
  function bindName() {
    var _this3 = this;
    var ns = this.qus('[name]');
    ns == null ? void 0 : ns.forEach(function (n) {
      var $n = $(n);
      var nm = $n.attr('name');
      if (!_this3.n) _this3.n = {};
      if (!_this3.n[nm] || _this3.n[nm].dom !== n) _this3.n[nm] = $n;
      if (!_this3[nm] || D.isD(_this3[nm]) && _this3[nm].dom !== n) _this3[nm] = $n;
    });
    return this;
  }
  function names(v) {
    return this.atts('name', v);
  }
  function clas(cls) {
    var R = [];
    if (!cls) return $();
    try {
      var _this$dom3;
      var rs = [];
      var cs = cls.split(',');
      cs.forEach(function (c) {
        if (c) {
          if (c.includes('.')) rs.push(c.trim());else rs.push("." + c.trim());
        }
      });
      R = (_this$dom3 = this.dom) == null ? void 0 : _this$dom3.querySelector(rs.join(','));
    } catch (e) {}
    return $(R || []);
  }
  function classes(cls) {
    var R = [];
    if (!cls) return $();
    try {
      var _this$dom4;
      var rs = [];
      var cs = cls.split(',');
      cs.forEach(function (c) {
        if (c.includes('.')) rs.push(c.trim());else rs.push("." + c.trim());
      });
      var ns = (_this$dom4 = this.dom) == null ? void 0 : _this$dom4.querySelectorAll(rs.join(','));
      if (ns && ns.length > 0) R = Array.from(ns);
    } catch (e) {}
    return $(R || []);
  }
  function tag(t) {
    var _this$dom5;
    var R = (_this$dom5 = this.dom) == null ? void 0 : _this$dom5.getElementsByTagName(t);
    if (R) R = R[0];
    return $(R);
  }
  function tags(t) {
    var _this$dom6;
    var R = (_this$dom6 = this.dom) == null ? void 0 : _this$dom6.getElementsByTagName(t);
    if (R && R.length > 0) R = [].slice.call(R);else R = [];
    return $(R);
  }

  var Methods = /*#__PURE__*/Object.freeze({
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

  function scrollTo() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    var left = args[0],
      top = args[1],
      duration = args[2],
      easing = args[3],
      callback = args[4];
    if (args.length === 4 && typeof easing === 'function') {
      callback = easing;
      left = args[0];
      top = args[1];
      duration = args[2];
      callback = args[3];
      easing = args[4];
    }
    if (typeof easing === 'undefined') easing = 'swing';
    return this.each(function animate() {
      var el = this;
      var currentTop;
      var currentLeft;
      var maxTop;
      var maxLeft;
      var newTop;
      var newLeft;
      var scrollTop;
      var scrollLeft;
      if (typeof easing === 'undefined') easing = 'swing';
      var hasScrollTop = ('scrollTop' in el);
      var hasScrollLeft = ('scrollLeft' in el);
      var animateTop = top > 0 || top === 0;
      var animateLeft = left > 0 || left === 0;
      if (animateTop) {
        currentTop = el.scrollTop;
        if (!duration) {
          if (hasScrollTop) el.scrollTop = top;else el.scrollTo(el.scrollX, top);
        }
      }
      if (animateLeft) {
        currentLeft = el.scrollLeft;
        if (!duration) {
          if (hasScrollLeft) el.scrollLeft = left;else el.scrollTo(left, el.scrollY);
        }
      }
      if (!duration) return;
      if (animateTop) {
        maxTop = el.scrollHeight - el.offsetHeight;
        newTop = Math.max(Math.min(top, maxTop), 0);
      }
      if (animateLeft) {
        maxLeft = el.scrollWidth - el.offsetWidth;
        newLeft = Math.max(Math.min(left, maxLeft), 0);
      }
      var startTime = null;
      if (animateTop && newTop === currentTop) animateTop = false;
      if (animateLeft && newLeft === currentLeft) animateLeft = false;
      function render(time) {
        if (time === void 0) {
          time = new Date().getTime();
        }
        if (startTime === null) {
          startTime = time;
        }
        var progress = Math.max(Math.min((time - startTime) / duration, 1), 0);
        var easeProgress = easing === 'linear' ? progress : 0.5 - Math.cos(progress * Math.PI) / 2;
        var done;
        if (animateTop) scrollTop = currentTop + easeProgress * (newTop - currentTop);
        if (animateLeft) scrollLeft = currentLeft + easeProgress * (newLeft - currentLeft);
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
  function scrollTop() {
    if (!this.length) return;
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }
    var top = args[0],
      duration = args[1],
      easing = args[2],
      callback = args[3];
    if (args.length === 3 && typeof easing === 'function') {
      top = args[0];
      duration = args[1];
      callback = args[2];
      easing = args[3];
    }
    var hasScrollTop = ('scrollTop' in this[0]);
    if (top === undefined) return hasScrollTop ? this[0].scrollTop : this[0].pageYOffset;
    return this.scrollTo(undefined, top, duration, easing, callback);
  }
  function scrollLeft() {
    if (!this.length) return;
    for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }
    var left = args[0],
      duration = args[1],
      easing = args[2],
      callback = args[3];
    if (args.length === 3 && typeof easing === 'function') {
      left = args[0];
      duration = args[1];
      callback = args[2];
      easing = args[3];
    }
    var hasScrollLeft = ('scrollLeft' in this[0]);
    if (left === undefined) return hasScrollLeft ? this[0].scrollLeft : this[0].pageXOffset;
    return this.scrollTo(left, undefined, duration, easing, callback);
  }
  function scrollHeight() {
    return this[0].scrollHeight;
  }
  function scrollWidth() {
    return this[0].scrollWidth;
  }

  var Scroll = /*#__PURE__*/Object.freeze({
    __proto__: null,
    scrollHeight: scrollHeight,
    scrollLeft: scrollLeft,
    scrollTo: scrollTo,
    scrollTop: scrollTop,
    scrollWidth: scrollWidth
  });

  function animate(initialProps, initialParams) {
    var els = this;
    var a = {
      props: Object.assign({}, initialProps),
      params: Object.assign({
        duration: 300,
        easing: 'swing'
      }, initialParams),
      elements: els,
      animating: false,
      que: [],
      easingProgress: function easingProgress(easing, progress) {
        if (easing === 'swing') {
          return 0.5 - Math.cos(progress * Math.PI) / 2;
        }
        if (typeof easing === 'function') {
          return easing(progress);
        }
        return progress;
      },
      stop: function stop() {
        if (a.frameId) {
          $.cancelAnimationFrame(a.frameId);
        }
        a.animating = false;
        a.elements.each(function (index, el) {
          var element = el;
          delete element.dom7AnimateInstance;
        });
        a.que = [];
      },
      done: function done(complete) {
        a.animating = false;
        a.elements.each(function (index, el) {
          var element = el;
          delete element.domAnimateInstance;
        });
        if (complete) complete(els);
        if (a.que.length > 0) {
          var que = a.que.shift();
          a.animate(que[0], que[1]);
        }
      },
      animate: function animate(props, params) {
        if (a.animating) {
          a.que.push([props, params]);
          return a;
        }
        var elements = [];
        a.elements.each(function (index, el) {
          var initialFullValue;
          var initialValue;
          var unit;
          var finalValue;
          var finalFullValue;
          if (!el.dom7AnimateInstance) a.elements[index].domAnimateInstance = a;
          elements[index] = {
            container: el
          };
          Object.keys(props).forEach(function (prop) {
            initialFullValue = window.getComputedStyle(el, null).getPropertyValue(prop).replace(',', '.');
            initialValue = parseFloat(initialFullValue);
            unit = initialFullValue.replace(initialValue, '');
            finalValue = parseFloat(props[prop]);
            finalFullValue = props[prop] + unit;
            elements[index][prop] = {
              initialFullValue: initialFullValue,
              initialValue: initialValue,
              unit: unit,
              finalValue: finalValue,
              finalFullValue: finalFullValue,
              currentValue: initialValue
            };
          });
        });
        var startTime = null;
        var time;
        var elementsDone = 0;
        var propsDone = 0;
        var done;
        var began = false;
        a.animating = true;
        function render() {
          time = new Date().getTime();
          var progress;
          var easeProgress;
          if (!began) {
            began = true;
            if (params.begin) params.begin(els);
          }
          if (startTime === null) {
            startTime = time;
          }
          if (params.progress) {
            params.progress(els, Math.max(Math.min((time - startTime) / params.duration, 1), 0), startTime + params.duration - time < 0 ? 0 : startTime + params.duration - time, startTime);
          }
          elements.forEach(function (element) {
            var el = element;
            if (done || el.done) return;
            Object.keys(props).forEach(function (prop) {
              if (done || el.done) return;
              progress = Math.max(Math.min((time - startTime) / params.duration, 1), 0);
              easeProgress = a.easingProgress(params.easing, progress);
              var _el$prop = el[prop],
                initialValue = _el$prop.initialValue,
                finalValue = _el$prop.finalValue,
                unit = _el$prop.unit;
              el[prop].currentValue = initialValue + easeProgress * (finalValue - initialValue);
              var currentValue = el[prop].currentValue;
              if (finalValue > initialValue && currentValue >= finalValue || finalValue < initialValue && currentValue <= finalValue) {
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
          a.frameId = $.requestAnimationFrame(render);
        }
        a.frameId = $.requestAnimationFrame(render);
        return a;
      }
    };
    if (a.elements.length === 0) {
      return els;
    }
    var animateInstance;
    for (var i = 0; i < a.elements.length; i += 1) {
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
    var els = this;
    for (var i = 0; i < els.length; i += 1) {
      if (els[i].domAnimateInstance) {
        els[i].domAnimateInstance.stop();
      }
    }
  }
  function getTranslate(axis) {
    if (axis === void 0) {
      axis = 'x';
    }
    var els = this;
    if (!els || !els.dom) return 0;
    var el = els.dom;
    var matrix;
    var curTransform;
    var transformMatrix;
    var curStyle = window.getComputedStyle(el, null);
    if (window.WebKitCSSMatrix) {
      curTransform = curStyle.transform || curStyle.webkitTransform;
      if (curTransform.split(',').length > 6) {
        curTransform = curTransform.split(', ').map(function (a) {
          return a.replace(',', '.');
        }).join(', ');
      }
      transformMatrix = new window.WebKitCSSMatrix(curTransform === 'none' ? '' : curTransform);
    } else {
      transformMatrix = curStyle.MozTransform || curStyle.OTransform || curStyle.MsTransform || curStyle.msTransform || curStyle.transform || curStyle.getPropertyValue('transform').replace('translate(', 'matrix(1, 0, 0, 1,');
      matrix = transformMatrix.toString().split(',');
    }
    if (axis === 'x') {
      if (window.WebKitCSSMatrix) curTransform = transformMatrix.m41;else if (matrix.length === 16) curTransform = parseFloat(matrix[12]);else curTransform = parseFloat(matrix[4]);
    }
    if (axis === 'y') {
      if (window.WebKitCSSMatrix) curTransform = transformMatrix.m42;else if (matrix.length === 16) curTransform = parseFloat(matrix[13]);else curTransform = parseFloat(matrix[5]);
    }
    return curTransform || 0;
  }

  var Animate = /*#__PURE__*/Object.freeze({
    __proto__: null,
    animate: animate,
    getTranslate: getTranslate,
    stop: stop
  });

  function _extends() {
    _extends = Object.assign ? Object.assign.bind() : function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    };
    return _extends.apply(this, arguments);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
    return arr2;
  }

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _createForOfIteratorHelperLoose(o, allowArrayLike) {
    var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
    if (it) return (it = it.call(o)).next.bind(it);
    if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
      if (it) o = it;
      var i = 0;
      return function () {
        if (i >= o.length) return {
          done: true
        };
        return {
          done: false,
          value: o[i++]
        };
      };
    }
    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function setViews(v, n, add) {
    if (add === void 0) {
      add = false;
    }
    try {
      var el = this;
      if (!add) clearForm.bind(el)();
      if (!n) n = el.attr('name');
      if (n) {
        var tp = el.name(n + "-tp");
        if (tp.length) {
          tp.hide();
          if ($.isArray(v)) v.forEach(function (r) {
            addSet.bind(el)(n, r);
          });else addSet.bind(el)(n, v);
        } else Object.keys(v).forEach(function (k) {
          return setView.bind(el)(v[k], k);
        });
      } else if ($.isObject(v)) Object.keys(v).forEach(function (k) {
          return setView.bind(el)(v[k], k);
        });
    } catch (ex) {
      console.error('setViews exp.', {
        msg: ex.message
      });
    }
  }
  function addViews(v, n) {
    var el = this;
    if (!n) n = el.attr('name');
    setViews.bind(el)(v, n, true);
  }
  function getForm(n) {
    var R = null;
    try {
      var el = this;
      el.find('input[type=hidden]').forEach(function (d) {
        if (!$.isEmpty(d.data)) d.value = JSON.stringify(d.data);
      });
      if (!n) n = el.attr('name');
      var tp = el.name(n + "-tp");
      var prev = null;
      var hasTp = tp.length;
      if (hasTp) {
        hasTp = true;
        prev = tp.prev();
        tp.remove();
      }
      var fd = new FormData(el.dom);
      if (hasTp) tp.insertAfter(prev);
      var rs = [];
      var last = null;
      var r = {};
      for (var _iterator = _createForOfIteratorHelperLoose(fd.entries()), _step; !(_step = _iterator()).done;) {
        var e = _step.value;
        var k = e[0];
        if (!last) last = k;else if (last === k) {
          if (!$.isEmpty(r)) rs.push(_extends({}, r));
          r = {};
        }
        var v = e[1];
        try {
          if (/^\s*[{[]/.test(v)) v = JSON.parse(v);
        } catch (ex) {
          console.error('getForm exp.', {
            msg: ex.message
          });
        }
        r[k] = v;
      }
      if ($.hasVal(r)) rs.push(r);
      if (rs.length === 1) {
        R = rs[0];
      } else if (rs.length > 1) R = rs;
    } catch (ex) {
      console.error('getForm exp.', {
        msg: ex.message
      });
    }
    return R;
  }
  function clearForm() {
    try {
      var el = this;
      var es = el.find('input,textarea');
      es.forEach(function (e) {
        if (e.data) {
          e.data = null;
          delete e.data;
        }
        if (e.type !== 'checkbox') e.value = '';
      });
      el.find('[name$=-data]').remove();
      el.find('[name$=-empty]').show();
    } catch (e) {
      console.error("clearForm exp:" + e.message);
    }
  }
  function setView(v) {
    var R = false;
    try {
      if (v === undefined || v === null) return false;
      var el = this;
      var add = false;
      var idx = -1;
      var form = false;
      var name = el.attr('name');
      if (arguments.length <= 1 ? 0 : arguments.length - 1) {
        if ($.isObject(arguments.length <= 1 ? undefined : arguments[1])) {
          var def = {
            add: add,
            name: name,
            idx: idx,
            form: form
          };
          var opt = _extends({}, def, arguments.length <= 1 ? undefined : arguments[1]);
          add = opt.add;
          name = opt.name;
          idx = opt.idx;
          form = opt.form;
        } else if ($.isArray(v) && $.isNumber(arguments.length <= 1 ? undefined : arguments[1])) {
          if ((arguments.length <= 1 ? 0 : arguments.length - 1) >= 1) idx = arguments.length <= 1 ? undefined : arguments[1];
          if ((arguments.length <= 1 ? 0 : arguments.length - 1) >= 2 && $.isString(arguments.length <= 2 ? undefined : arguments[2])) name = arguments.length <= 2 ? undefined : arguments[2];
          if ((arguments.length <= 1 ? 0 : arguments.length - 1) >= 3 && $.isBool(arguments.length <= 3 ? undefined : arguments[3])) add = arguments.length <= 3 ? undefined : arguments[3];
        } else {
          if ((arguments.length <= 1 ? 0 : arguments.length - 1) >= 1) {
            if ($.isString(arguments.length <= 1 ? undefined : arguments[1])) name = arguments.length <= 1 ? undefined : arguments[1];else if ($.isBool(arguments.length <= 1 ? undefined : arguments[1])) add = arguments.length <= 1 ? undefined : arguments[1];
          }
          if ((arguments.length <= 1 ? 0 : arguments.length - 1) >= 2 && $.isBool(arguments.length <= 2 ? undefined : arguments[2])) add = arguments.length <= 2 ? undefined : arguments[2];
        }
      }
      if (!add) {
        if (form) clearForm.bind(el)();
        clearView.bind(el)(name);
      }
      if (form && $.isObject(v)) {
        Object.keys(v).forEach(function (k) {
          return setData.bind(el)(k, v[k]);
        });
      } else if (name) R = setData.bind(el)(name, v, idx);
    } catch (ex) {
      console.error('setView exp.', {
        msg: ex.message
      });
    }
    return R;
  }
  function setForm(v, opts) {
    var opt = opts || {};
    opt.form = true;
    setView.bind(this)(v, opt);
  }
  function addView(v) {
    var el = this;
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }
    setView.bind(el).apply(void 0, [v].concat(args, [true]));
  }
  function clearView(n) {
    try {
      var el = this;
      if (!n) n = el.attr('name');
      var es = el.names(n);
      es.forEach(function (e) {
        if (e.tagName.toLowerCase() === 'input' || e.tagName.toLowerCase() === 'textarea') {
          if (e.data) {
            e.data = null;
            delete e.data;
          }
          if (e.type !== 'checkbox') e.value = '';
        }
      });
      el.names(n + "-data").remove();
      el.name(n + "-empty").show();
    } catch (e) {
      console.error("clearView exp:" + e.message);
    }
  }
  function getView(n) {
    var R = null;
    try {
      var el = this;
      if (!n) n = el.attr('name');
      var d = el.name(n);
      if (d.length) {
        if ($.hasVal(d.data)) R = d.data;else R = d.val();
      }
    } catch (ex) {
      console.error('getView exp.', {
        msg: ex.message
      });
    }
    return R;
  }
  function removeChip(e) {
    console.log('removeChip', {
      e: e
    });
    var el = $(e.target).closest('.chip');
    if (el && el.length > 0) {
      var id = el.data('id');
      if (!id) id = el.data('_id');
      var n = el.prevNode('input[type=hidden]');
      el.remove();
      if (n && n.length > 0) {
        id = n.val().replace(new RegExp(id + "\\s*,?\\s*"), '').replace(/\s*,\s*$/, '');
        n.val(id);
      }
    }
  }
  function addSet(n, v) {
    try {
      var el = this;
      var tp = el.name(n + "-tp");
      if (tp.length) {
        tp.hide();
        var p = tp.clone();
        p.insertBefore(tp);
        Object.keys(v).forEach(function (k) {
          setView.bind(p)(v[k], k);
        });
        p.attr('name', tp.attr('name').replace('-tp', '-data')).show();
      }
    } catch (ex) {
      console.error('addSet exp.', {
        msg: ex.message
      });
    }
  }
  function render(tp, r) {
    var code = "function(r){return `" + tp + "`}";
    return Function("\"use strict\";return (" + code + ")")()(r);
  }
  function addData(tp, n, r, ns, idx) {
    if (idx === void 0) {
      idx = -1;
    }
    try {
      if (!tp) return;
      var isObj = $.isObject(r);
      var isArr = $.isArray(r);
      var id;
      var _id;
      if (isObj) {
        id = r.id;
        _id = r._id;
      } else if (isArr) {
        if (idx > -1) id = r[idx];
      } else _id = r;
      if ((id !== undefined || _id !== undefined) && ns != null && ns.length) {
        var ds = ns.filter(function (i, n) {
          var $n = $(n);
          return id && $n.data('id') == id || _id && $n.data('_id') == _id;
        });
        if (ds.length) ds.remove();
      }
      var $n = $(render(tp.dom.outerHTML, r).replaceAll('undefined:', '').replaceAll('undefined：', '').replaceAll('undefined', ''));
      if (id !== undefined) $n.data('id', id);else if (_id !== undefined) $n.data('_id', _id);
      $n.attr('name', n + "-data").insertBefore(tp).show();
    } catch (ex) {
      console.error('addData exp.', {
        msg: ex.message
      });
    }
  }
  function setData(n, v, idx) {
    if (idx === void 0) {
      idx = -1;
    }
    try {
      if (!n) return false;
      var el = this;
      var $d = el.name(n);
      if ($d.length > 0) {
        var _v;
        var d = $d.dom;
        v = (_v = v) != null ? _v : '';
        if (v === 'null' || v === 'undefined') v = '';
        if (d.tagName.toLowerCase() === 'textarea') $d.val(v);else if (d.tagName.toLowerCase() === 'input') {
          if (d.type === 'text') setInput.bind(el)(n, v);else if (['date', 'time', 'month', 'week', 'datetime', 'datetime-local', 'email', 'number', 'search', 'url'].includes(d.type)) $d.val(v);else if (d.type === 'hidden') {
            setInput.bind(el)(n, v);
            $d.change();
          } else if (d.type === 'select-one' || d.type === 'select-multiple' || d.type === 'checkbox' || d.type === 'radio') {
            $d.val(v, el);
          }
        }
      }
      if ($.isEmpty(v)) return false;
      var tp = el.name(n + "-tp");
      if (tp.length) {
        tp.hide();
        var kv = false;
        var tpa = tp.attr('tp');
        if (tpa === 'kv' || /kv-\d+/.test(tpa)) kv = true;
        var empty = el.names(n + "-data").length === 0;
        var _d = el.name(n).dom;
        if (_d && _d.type === 'hidden') {
          var val = _d.value;
          if (!$.isEmpty(_d.data)) v = _d.data;else if (val) {
            v = val;
            if (val.indexOf(',') > -1) v = val.split(',');
          }
        }
        var ns = el.names(n + "-data");
        if ($.isArray(v)) v.forEach(function (r, x) {
          if (r) {
            empty = false;
            addData.bind(el)(tp, n, r, ns, idx);
          }
        });else if ($.isObject(v) && kv) {
          var ks = Object.keys(v);
          if (ks.length) {
            empty = false;
            var ms = /kv-(\d+)/.exec(tpa);
            if (!ms) {
              ks.forEach(function (vk) {
                if (v[vk]) {
                  addData.bind(el)(tp, n, {
                    k: vk,
                    v: v[vk]
                  }, ns, idx);
                }
              });
            } else {
              var kn = ms[1];
              var ik = 0;
              var mks = [];
              var mvs = [];
              var m = 0;
              ks.forEach(function (vk) {
                var _v$vk;
                ik++;
                mks.push(vk);
                mvs.push((_v$vk = v[vk]) != null ? _v$vk : '');
                m = ik % kn;
                if (m === 0) {
                  var md = {};
                  mks.forEach(function (mk, mi) {
                    md["k" + (mi + 1)] = mks[mi];
                    md["v" + (mi + 1)] = mvs[mi];
                  });
                  console.log('setData', {
                    md: md
                  });
                  addData.bind(el)(tp, n, md, ns, idx);
                  mks.length = 0;
                  mvs.length = 0;
                }
              });
              if (m > 0) {
                var md = {};
                mks.forEach(function (mk, mi) {
                  md["k" + (mi + 1)] = mks[mi];
                  md["v" + (mi + 1)] = mvs[mi];
                });
                console.log('setData', {
                  md: md
                });
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
        if (tp.hasClass('chip')) {
          var p = tp.parentNode();
          p.off('click', removeChip);
          p.click(removeChip);
        }
        var imgs = tp.find('img[src-tp]');
        el.find('img[src-tp]').forEach(function (img) {
          if (imgs.length === 0 || imgs.indexOf(img) === -1) {
            var $img = $(img);
            $img.attr('src', $img.attr('src-tp'));
            $img.removeAttr('src-tp');
          }
        });
        if (empty) el.name(n + "-empty").show();else el.name(n + "-empty").hide();
      } else {
        var r = v;
        var vp = el.name(n + "-val");
        if (vp.length) {
          var tx = vp.html();
          if (r && tx.indexOf('${') > -1) {
            vp.html(render(tx, r).replaceAll('undefined:', '').replaceAll('undefined：', '').replaceAll('undefined', ''));
            vp.find('img[src-tp]').forEach(function (n) {
              var $n = $(n);
              $n.attr('src', $n.attr('src-tp'));
            });
          } else if (r) vp.html(r);
        } else {
          if ($d.length && $d.dom.type !== 'text') {
            var _tx = $d.html();
            if (r && (_tx == null ? void 0 : _tx.indexOf('${')) > -1) {
              $d.html(render(_tx, r).replaceAll('undefined:', '').replaceAll('undefined：', '').replaceAll('undefined', ''));
              $d.find('img[src-tp]').forEach(function (img) {
                var $img = $(img);
                $img.attr('src', $img.attr('src-tp'));
              });
            }
          }
        }
      }
    } catch (ex) {
      console.error('setData exp.', {
        msg: ex.message
      });
    }
  }
  function getValue(n, v, org) {
    var R = v;
    try {
      if ($.isObject(v)) {
        if ($.isObject(org)) {
          if (org.id && org.id == v.id || org._id && org._id == v._id) R = v;else R = [org, v];
        } else if ($.isArray(org)) {
          var rs = org.filter(function (o) {
            return !o.id && !o._id || o.id && o.id != v.id || o._id && o._id != v._id;
          });
          if (rs.length) {
            rs.push(v);
            R = rs;
          }
        }
      } else {
        var val = org + "," + v;
        if (val.indexOf(',') > -1) val = Array.from(new Set(val.split(','))).join(',');
        R = val;
      }
    } catch (e) {
      console.error('getValue exp.', {
        msg: e.message
      });
    }
    return R;
  }
  function setInput(n, v) {
    try {
      var el = this;
      var d = el.name(n);
      if (!d.length) return;
      if ($.isEmpty(v)) return;
      if ($.isObject(v) && v.id === undefined && v._id === undefined) v._id = $.num();else if ($.isArray(v)) {
        v.forEach(function (r) {
          if ($.isObject(r) && r.id === undefined && r._id === undefined) r._id = $.num();
        });
      }
      var org = d.dom.data;
      if (!org) {
        org = d.val();
        if (d.dom.type === 'hidden' && /\s*[{[]/g.test(org)) {
          try {
            org = JSON.parse(org);
            d.dom.data = org;
            d.val('');
          } catch (e) {
            console.error('setInput exp.', {
              msg: e.message
            });
          }
        }
      }
      if ($.isEmpty(org)) {
        if ($.isVal(v)) d.val(v);else if ($.isArray(v) && $.isVal(v[0])) d.val(v.join(','));else d.dom.data = v;
      } else {
        if ($.isArray(v)) {
          v = v.reduce(function (pre, cur) {
            return getValue(d, cur, pre);
          }, org);
          if ($.hasVal(v) && $.isArray(v)) {
            v = Array.from(new Set(v));
          }
        } else v = getValue(d, v, org);
        if ($.hasVal(v)) {
          if ($.isVal(v)) d.val(v);else if ($.isArray(v) && $.isVal(v[0])) d.val(v.join(','));else d.dom.data = v;
        }
      }
    } catch (ex) {
      console.error('setInput exp.', {
        msg: ex.message
      });
    }
  }

  var View = /*#__PURE__*/Object.freeze({
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

  var _window$$;
  var $$1 = (_window$$ = window.$) != null ? _window$$ : {};
  [Methods, Scroll, Animate, View].forEach(function (group) {
    Object.keys(group).forEach(function (methodName) {
      $$1.fn[methodName] = group[methodName];
    });
  });
  var noTrigger = 'resize scroll'.split(' ');
  ('load,unload,dblclick,select,error,click,blur,focus,focusin,' + 'focusout,keyup,keydown,keypress,submit,change,mousedown,mousemove,mouseup,' + 'mouseenter,mouseleave,mouseout,mouseover,touchstart,touchend,touchmove,resize,' + 'scroll,swipe,press').split(',').forEach(function (event) {
    $$1.fn[event] = function () {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      if (typeof args[0] === 'undefined') {
        for (var i = 0; i < this.length; i += 1) {
          try {
            if (noTrigger.indexOf(event) < 0) {
              if (event in this[i]) this[i][event]();else {
                $$1(this[i]).trigger(event);
              }
            }
          } catch (ex) {}
        }
        return this;
      }
      return this.on.apply(this, [event].concat(args));
    };
  });
  function traverseNode(node, fun) {
    fun(node);
    for (var i = 0, len = node.childNodes.length; i < len; i++) traverseNode(node.childNodes[i], fun);
  }
  var operators = ['after', 'prepend', 'before', 'append'];
  operators.forEach(function (op, idx) {
    var inside = idx % 2;
    $$1.fn[op] = function () {
      var argType;
      var nodes = $$1.map(arguments, function (arg) {
        var arr = [];
        argType = $$1.type(arg);
        if (argType == 'array') {
          arg.forEach(function (el) {
            if (el.nodeType !== undefined) return arr.push(el);else if ($$1.isDom(el)) return arr = arr.concat(el.get());
            arr = arr.concat($$1.fragment(el));
          });
          return arr;
        }
        return argType == 'object' || arg == null ? arg : $$1.fragment(arg);
      });
      if (nodes.length < 1) return this;
      var parent;
      var copyByClone = this.length > 1;
      return this.each(function (_, target) {
        parent = inside ? target : target.parentNode;
        target = idx == 0 ? target.nextSibling : idx == 1 ? target.firstChild : idx == 2 ? target : null;
        var parentInDoc = $$1.contains(document.documentElement, parent);
        nodes.forEach(function (node) {
          if (copyByClone) node = node.cloneNode(true);else if (!parent) return $$1(node).remove();
          parent.insertBefore(node, target);
          var ns = $$1.qus('a[href=""]', parent);
          if (ns && ns.length > 0) ns.forEach(function (n) {
            return n.setAttribute('href', 'javascript:;');
          });
          if (parentInDoc) traverseNode(node, function (el) {
              if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' && (!el.type || el.type === 'text/javascript') && !el.src) {
                var target = el.ownerDocument ? el.ownerDocument.defaultView : window;
                target['eval'].call(target, el.innerHTML);
              }
            });
        });
      });
    };
    var op2 = inside ? op + 'To' : 'insert' + (idx ? 'Before' : 'After');
    $$1.fn[op2] = function (html) {
      $$1(html)[op](this);
      return this;
    };
  });
  $$1["default"] = $$1;

  return $$1;

}));
