

(function (root, factory) {
  var jqlite = factory(root);

  if( typeof module === 'object' && typeof exports === 'object' ) {
    module.exports = jqlite;
  } else {
    if ( typeof define === 'function' ) {
      define('jqlite', function () { return jqlite; } );
    } else if( typeof angular === 'function' ) {
      angular.module('jqlite', []).constant('jqlite', jqlite );
    } else {
      root.jqlite = jqlite;
    }
    if( !root.$ ) {
      root.$ = jqlite;
    }
  }

})(this, function (root) {
  'use strict';

  function _isType (type) {
      return function (o) {
          return (typeof o === type);
      };
  }

  function _instanceOf (_constructor) {
      return function (o) {
          return ( o instanceof _constructor );
      };
  }

	var _isObject = _isType('object'),
			_isFunction = _isType('function'),
			_isString = _isType('string'),
			_isNumber = _isType('number'),
			_isBoolean = _isType('boolean'),
			_isArray = Array.isArray || _instanceOf(Array),
			_isDate = _instanceOf(Date),
			_isRegExp = _instanceOf(RegExp),
      _isElement = function(o) {
        return o && o.nodeType === 1;
      },
      _find = function (list, iteratee) {
        if( !( iteratee instanceof Function ) ) {
          var value = iteratee;
          iteratee = function (item) {
            return item === value;
          };
        }

        for( var i = 0, n = list.length ; i < n ; i++ ) {
          if( iteratee(list[i]) ) {
            return {
              index: i,
              found: list[i]
            };
          }
        }

        return {
          index: -1
        };
      };

  var arrayShift = Array.prototype.shift;

  function _merge () {
    var dest = arrayShift.call(arguments),
        src = arrayShift.call(arguments),
        key;

    while( src ) {

      if( typeof dest !== typeof src ) {
        dest = _isArray(src) ? [] : ( _isObject(src) ? {} : src );
      }

      if( _isObject(src) ) {

        for( key in src ) {
          if( src[key] !== undefined ) {
            if( typeof dest[key] !== typeof src[key] ) {
                dest[key] = _merge(undefined, src[key]);
            } else if( _isArray(dest[key]) ) {
                [].push.apply(dest[key], src[key]);
            } else if( _isObject(dest[key]) ) {
                dest[key] = _merge(dest[key], src[key]);
            } else {
                dest[key] = src[key];
            }
          }
        }
      }
      src = arrayShift.call(arguments);
    }

    return dest;
  }

  function _extend () {
    var dest = arrayShift.call(arguments),
        src = arrayShift.call(arguments),
        key;

    while( src ) {
      for( key in src) {
        dest[key] = src[key];
      }
      src = arrayShift.call(arguments);
    }

    return dest;
  }

  var matchesSelectorProp = (function (proto) {
    if( proto.matchesSelector ) {
      return 'matchesSelector';
    } else if( proto.webkitMatchesSelector ) {
      return 'webkitMatchesSelector';
    } else if( proto.mozMatchesSelector ) {
      return 'mozMatchesSelector';
    } else if( proto.msMatchesSelector ) {
      return 'msMatchesSelector';
    } else if( proto.oMatchesSelector ) {
      return 'oMatchesSelector';
    }
    throw new Error('your browser does not support matchesSelector');
  })(Element.prototype);

  // function stopEvent (e) {
  //   if(e) e.stopped = true;
  //   if (e &&e.preventDefault) e.preventDefault();
  //   else if (window.event && window.event.returnValue) window.eventReturnValue = false;
  // }

  var triggerEvent = document.createEvent ? function (element, eventName, args, data) {
      var event = document.createEvent('HTMLEvents');
      event.data = data;
      event.args = args;
      event.initEvent(eventName, true, true);
      element.dispatchEvent(event);
      return event;
    } : function (element, eventName, args, data) {
      var event = document.createEventObject();
      event.data = data;
      event.args = args;
      element.fireEvent('on' + eventName, event);
      return event;
    };

    var runScripts = eval,
        noop = function noop () {},
        auxDiv = document.createElement('div'),
        detached = document.createElement('div'),
        classListEnabled = !!auxDiv.classList;

  // Events support

  if( !auxDiv.addEventListener && !document.body.attachEvent ) {
    throw 'Browser not compatible with element events';
  }

  var _attachElementListener = auxDiv.addEventListener ? function(element, eventName, listener) {
        return element.addEventListener(eventName, listener, false);
      } : function(element, eventName, listener) {
        return element.attachEvent('on' + eventName, listener);
      },
      _detachElementListener = auxDiv.removeEventListener ? function(element, eventName, listener) {
        return element.removeEventListener(eventName, listener, false);
      } : function(element, eventName, listener) {
        return element.detachEvent('on' + eventName, listener );
      };

  function detachElementListener (element, eventName, srcListener) {

    if( srcListener === undefined ) {
      if( element.$$jqListeners && element.$$jqListeners[eventName] ) {
        for( var i = 0, n = element.$$jqListeners[eventName].length ; i < n ; i++ ) {
          _detachElementListener( element, eventName, element.$$jqListeners[eventName][i] );
        }
        element.$$jqListeners[eventName] = [];
      }
      return;
    }

    if( element.$$jqListeners && element.$$jqListeners[eventName] ) {
      var _listener = _find(element.$$jqListeners[eventName], function (l) {
        return l.srcListener === srcListener;
      });

      if( _listener.found ) {
        element.$$jqListeners[eventName].splice( _listener.index, 1 );
        _detachElementListener( element, eventName, _listener.found );
      }
    }
  }

  function attachElementListener (element, eventName, listener, once) {

    var _listener = once ? function(e) {
        listener.apply(element, [e].concat(e.args) );
        detachElementListener(element, eventName, listener);
    } : function(e){
        listener.apply(element, [e].concat(e.args) );
    };

    _listener.srcListener = listener;

    element.$$jqListeners = element.$$jqListeners || {};
    element.$$jqListeners[eventName] = element.$$jqListeners[eventName] || [];

    element.$$jqListeners[eventName].push(_listener);

    _attachElementListener( element, eventName, _listener );
  }

  // jqlite function

  function pushMatches( list, matches ) {
    for( var i = 0, len = matches.length; i < len; i++ ) {
        list[i] = matches[i];
    }
    list.length += len;
    return list;
  }

  var RE_TAG = /^[a-z-_]$/i;

  function stringMatches (selector, element) {
    var char0 = selector[0];

    if( char0 === '<') {
      auxDiv.innerHTML = selector;
      var jChildren = pushMatches( new ListDOM(), auxDiv.children );
      return jChildren;
    } else if ( selector.indexOf(' ') !== -1 || selector.indexOf(':') !== -1 ) {
      return pushMatches( new ListDOM(), element.querySelectorAll(selector) );
    } else if( char0 === '#' ) {
      var found = element.getElementById(selector.substr(1));
      if( found ) {
        var listdom = new ListDOM();
        listdom[0] = found;
        listdom.length = 1;
        return listdom;
      } else {
        return pushMatches( new ListDOM(), element.querySelectorAll(selector) );
      }
    } else if( char0 === '.' ) {
      return pushMatches( new ListDOM(), element.getElementsByClassName(selector.substr(1)) );
    } else if( RE_TAG.test(selector) ) {
      // console.log(document.getElementsByTagName(selector), element.getElementsByTagName(selector).length);
      return pushMatches( new ListDOM(), element.getElementsByTagName(selector) );
    }
    return pushMatches( new ListDOM(), element.querySelectorAll(selector) );
  }

  function initList(selector) {

    if( selector instanceof ListDOM ) {
      return selector;
    } else if( _isArray(selector) || selector instanceof NodeList || selector instanceof HTMLCollection ) {
      return pushMatches( new ListDOM(), selector );
    } else if( selector === window || selector === document || selector instanceof HTMLElement || selector instanceof Element || _isElement(selector) ) {
      var list2 = new ListDOM();
      list2[0] = selector;
      list2.length = 1;
      return list2;

    } else if( _isFunction(selector) ) {
      ready(selector);
    } else if( selector === undefined ) {
      return new ListDOM();
    }
  }

  function jqlite (selector, element){
    if( _isString(selector) ) {
      return stringMatches(selector, element || document );
    }
    return initList(selector);
  }

  jqlite.noop = noop;

  jqlite.extend = function (deep) {
    var args = [].slice.call(arguments);
    if( _isBoolean(deep) ) {
      args.shift();
    } else {
      deep = false;
    }
    if( deep ) {
      _merge.apply(null, args );
    } else {
      _extend.apply(null, args );
    }
  };

  jqlite.isObject = _isObject;
  jqlite.isFunction = _isFunction;
  jqlite.isString = _isString;
  jqlite.isNumber = _isNumber;
  jqlite.isBoolean = _isBoolean;
  jqlite.isArray = _isArray;
  jqlite.isDate = _isDate;
  jqlite.isRegExp = _isRegExp;
  jqlite.isElement = _isElement;

  var $ = jqlite;

  // document ready

  var _onLoad = window.addEventListener ? function (listener) {
    window.addEventListener('load', listener, false);
  } : function (listener) {
    window.attachEvent('onload', listener );
  };

  function ready (callback) {
    if( _isFunction(callback) ) {
      if (/loaded|complete/.test(document.readyState)) {
        callback();
      } else {
        _onLoad(callback);
      }
    }
  }

  jqlite.ready = ready;

  // ListDOM

  function ListDOM(){}

  ListDOM.prototype = Object.create(Array.prototype);
  ListDOM.prototype.ready = ready;
  ListDOM.prototype.extend = function (deep) {
    var args = [].slice.call(arguments);
    if( _isBoolean(deep) ) {
      args.shift();
    } else {
      deep = false;
    }
    if( deep ) {
      _merge.apply(null, [ListDOM.prototype].concat(args) );
    } else {
      _extend.apply(null, [ListDOM.prototype].concat(args) );
    }
  };

  jqlite.fn = ListDOM.prototype;

  function filterDuplicated (list) {
    if( list.length <= 1 ) {
      return list;
    }

    var filteredList = list.filter(function () {
      if( this.___found___ ) {
        return false;
      }
      this.___found___ = true;
      return true;
    });

    for( var i = 0, len = filteredList.length; i < len ; i++ ) {
      delete filteredList[i].___found___;
    }
    return filteredList;
  }

  ListDOM.prototype.get = function(pos) {
      return pos ? this[pos] : this;
    };

  ListDOM.prototype.eq = function(pos) {
      if( !_isNumber(pos) ) {
        throw 'number required';
      }
      var item = ( pos < 0 ) ? this[this.length - pos] : this[pos], list = new ListDOM();

      if(item) {
        list[0] = item;
        list.length = 1;
      }
      return list;
    };

  ListDOM.prototype.first = function() {
      var list = new ListDOM();

      if( this.length ) {
        list[0] = this[0];
        list.length = 1;
      }
      return list;
    };

  ListDOM.prototype.last = function() {
      var list = new ListDOM();

      if( this.length ) {
        list[0] = this[this.length - 1];
        list.length = 1;
      }
      return list;
    };

  ListDOM.prototype.find = function(selector) {
      var list = this, elems = new ListDOM(), n = 0, i, j, len, len2, found;

      if( !selector ) {
        return list;
      }

      if( /^\s*>/.test(selector) ) {
        selector = selector.replace(/^\s*>\s*([^\s]*)\s*/, function (match, selector2) {
          list = list.children(selector2);
          return '';
        });
      }

      for( i = 0, len = list.length; i < len; i++ ) {
        found = list[i].querySelectorAll(selector);
        for( j = 0, len2 = found.length; j < len2 ; j++ ) {
          elems[n++] = found[j];
        }
      }
      elems.length = n;

      return filterDuplicated(elems);
    };


  ListDOM.prototype.$ = ListDOM.prototype.find;

  ListDOM.prototype.add = function (selector, element) {
    var el2add = jqlite(selector, element),
        i, len, n = this.length,
        elems = new ListDOM();

    for( i = 0, len = this.length ; i < len; i++ ) {
      elems[i] = this[i];
    }

    for( i = 0, len = el2add.length ; i < len; i++ ) {
      elems[n++] = el2add[i];
    }
    elems.length = n;

    return filterDuplicated(elems);
  };

  ListDOM.prototype.each = function(each) {
      if( _isFunction(each) ) {
        for( var i = 0, len = this.length; i < len ; i++ ) {
          each.call(this[i], i, this[i]);
        }
      }
      return this;
    };

  ListDOM.prototype.empty = function() {
      for( var i = 0, len = this.length, elem, child; i < len ; i++ ) {
          elem = this[i];
          child = elem.firstChild;
          while( child ) {
            elem.removeChild(child);
            child = elem.firstChild;
          }
      }
      return this;
    };

  ListDOM.prototype.filter = function(selector) {
      var elems = new ListDOM(), elem, i, len;

      if( _isFunction(selector) ) {
        for( i = 0, len = this.length, elem; i < len ; i++ ) {
          elem = this[i];
          if( selector.call(elem, i, elem) ) {
            elems.push(elem);
          }
        }
      } else if( _isString(selector) ) {
        for( i = 0, len = this.length, elem; i < len ; i++ ) {
          elem = this[i];
          if( elem[matchesSelectorProp](selector) ) {
            elems.push(elem);
          }
        }
      }
      return elems;
    };

  var _getClosest = auxDiv.closest ? function (element, selector) {
    return element.closest(selector);
  } : function (element, selector) {
    var elem = element.parentElement;

    while( elem ) {
      if( elem[matchesSelectorProp](selector) ) {
        return elem;
      }
      elem = elem.parentElement;
    }
    return null;
  };

  ListDOM.prototype.closest = function(selector) {
      var elems = new ListDOM(), n = 0, elem;

      if( !selector ) {
        return this;
      }

      for( var i = 0, len = this.length; i < len; i++ ) {
        elem = _getClosest(this[i], selector);
        if( elem ) {
          elems[n++] = elem;
        }
      }
      elems.length = n;

      return filterDuplicated(elems);
    };

  ListDOM.prototype.children = auxDiv.children ? function (selector){
      var elems = new ListDOM();

      for( var i = 0, len = this.length; i < len; i++ ) {
        pushMatches(elems, this[i].children);
      }

      return selector ? elems.filter(selector) : elems;

    } : function (selector) {
      var elems = new ListDOM();

      Array.prototype.forEach.call(this, function(elem){
        elem = elem.firstElementChild || elem.firstChild;
        while(elem) {
          elems[elems.length] = elem;
          elem = elem.nextElementSibling || elem.nextSibling;
        }
      });

      return selector ? elems.filter(selector) : elems;
    };

  ListDOM.prototype.parent = function (selector) {
      var list = new ListDOM(), n = 0;

      for( var i = 0, len = this.length; i < len; i++ ) {
        if( this[i].parentElement ) {
          list[n++] = this[i].parentElement;
        }
      }
        list.length = n;

      return filterDuplicated( selector ? list.filter(selector): list );
    };

  ListDOM.prototype.contents = function (selector) {
      var elems = new ListDOM();

      Array.prototype.forEach.call(this,function(elem){
        elem = elem.firstChild;
        while(elem) {
          elems[elems.length] = elem;
          elem = elem.nextSibling;
        }
      });

      return selector ? elems.filter(selector) : elems;
    };


  ListDOM.prototype.attr = function (key, value) {
      var i, len;
      if( _isFunction(value) ) {
        for( i = 0, len = this.length; i < len ; i++ ) {
          this[i].setAttribute( key, value(i, this[i].getAttribute(key) ) );
        }
      } else if( value !== undefined ) {
        for( i = 0, len = this.length; i < len ; i++ ) {
          this[i].setAttribute(key,value);
        }
      } else if( this[0] ) {
        return this[0].getAttribute( key );
      }
      return this;
    };

  ListDOM.prototype.removeAttr = function (key) {
      for( var i = 0, len = this.length; i < len ; i++ ) {
        this[i].removeAttribute(key);
      }
      return this;
    };



  ListDOM.prototype.wrapAll = function (content) {
    var element = $( _isFunction(content) ? content() : content )[0],
        parent = this[0].parentElement;

    parent.replaceChild(element, this[0]);

    if( element ) {
      while( element.firstElementChild ) {
        element = element.firstElementChild;
      }
    }

    for( var i = 0, len = this.length; i < len ; i++ ) {
      element.appendChild(this[i]);
    }

    return $(element);
  };

  ListDOM.prototype.unwrap = function () {

    var parents = this.parent(), parent;

    for( var i = 0, len = parents.length; i < len ; i++ ) {
      parent = parents.eq(i);
      parent.replaceWith( parent.children() );
    }

    return this;
  };

  ListDOM.prototype.next = function (selector) {
      var list = new ListDOM(), elem, n = 0;

      for( var i = 0, len = this.length; i < len; i++ ) {
        elem = this[i].nextElementSibling;
        if( elem ) {
          list[n++] = elem;
        }
      }
      list.length = n;

      return ( typeof selector === 'string' ) ? list.filter(selector): list;
    };

  ListDOM.prototype.nextAll = function (selector) {
      var list = new ListDOM(), elem, n = 0;

      for( var i = 0, len = this.length; i < len; i++ ) {
        elem = this[i].nextElementSibling;
        while( elem ) {
          list[n++] = elem;
          elem = elem.nextElementSibling;
        }
      }
      list.length = n;

      return filterDuplicated( selector ? list.filter(selector): list );
    };

  ListDOM.prototype.prev = function (selector) {
      var list = new ListDOM(), elem, n = 0;

      for( var i = 0, len = this.length; i < len; i++ ) {
        elem = this[i].previousElementSibling;
        if( elem ) {
          list[n++] = elem;
        }
      }
      list.length = n;

      return selector ? list.filter(selector): list;
    };

  function _prevAll (list, element, n) {
    if( element ) {
      if( element.previousElementSibling ) {
        n = _prevAll(list, element.previousElementSibling, n);
      }
      list[n++] = element;
    }
    return n;
  }

  ListDOM.prototype.prevAll = function (selector) {
      var list = new ListDOM(), n = 0;

      for( var i = 0, len = this.length; i < len; i++ ) {
        n = _prevAll(list, this[i].previousElementSibling, n);
      }
      list.length = n;

      return filterDuplicated( selector ? list.filter(selector): list );
    };

  ListDOM.prototype.remove = function (selector) {
      var list = selector ? this.filter(selector) : this, parent;

      for( var i = 0, len = list.length; i < len; i++ ) {
        parent = list[i].parentElement || list[i].parentNode;
        if( parent ) {
          parent.removeChild(list[i]);
        }
      }

      return this;
    };

  ListDOM.prototype.detach = function (selector) {
      var list = selector ? this.filter(selector) : this,
          elems = new ListDOM();

      for( var i = 0, len = list.length; i < len; i++ ) {
        detached.appendChild(list[i]);
        elems.push(list[i]);
      }

      return elems;
    };

  ListDOM.prototype.css = function (key, value) {

      if( value !== undefined ) {
        var i, len;
        value = ( value instanceof Function ) ? value() : ( value instanceof Number ? (value + 'px') : value );

        if( typeof value === 'string' && /^\+=|\-=/.test(value) ) {
          value = ( value.charAt(0) === '-' ) ? -parseFloat(value.substr(2)) : parseFloat(value.substr(2));

          for( i = 0, len = this.length; i < len; i++ ) {
            this[i].style[key] = parseFloat(this[i].style[key]) + value + 'px';
          }
        } else {
          for( i = 0, len = this.length; i < len; i++ ) {
            this[i].style[key] = value;
          }
        }
        return this;
      } else if( key instanceof Object ) {
        for( var k in key ) {
          this.css(k, key[k]);
        }
      } else if( this[0] ) {
        return this[0].style[key] || window.getComputedStyle(this[0])[key];
      }

      return this;
    };

  var transitionKey = auxDiv.style.webkitTransition !== undefined ? 'webkitTransition' : (
    auxDiv.style.mozTransition !== undefined ? 'mozTransition' : (
      auxDiv.style.msTransition !== undefined ? 'msTransition' : undefined
    )
  );

  function animateFade (list, show, time, timingFunction, callback) {
    if( typeof time === 'string' ) {
      time = animateFade.times[time];
    }

    timingFunction = timingFunction || 'linear';
    var opacityStart = show ? 0 : 1,
        opacityEnd = show ? 1 : 0;

    for( var i = 0, n = list.length; i < n ; i++ ) {
      list[i].style.opacity = opacityStart;
    }
    setTimeout(function () {
      for( var i = 0, n = list.length; i < n ; i++ ) {
        list[i].$$jqliteTransition = list[i].$$jqliteTransition === undefined ? ( list[i].style[transitionKey] || '' ) : list[i].$$jqliteTransition;
        list[i].style[transitionKey] = 'opacity ' + time + 'ms ' + timingFunction;
        list[i].style.opacity = opacityEnd;
      }
    }, 20);

    setTimeout(function () {
      for( var i = 0, n = list.length; i < n ; i++ ) {
        list[i].style.opacity = '';
        list[i].style[transitionKey] = list[i].$$jqliteTransition;
      }
      callback.call(list);
    }, time);

    return list;
  }

  animateFade.times = {
    slow: 600,
    normal: 400,
    fast: 200
  };

  ListDOM.prototype.show = function (time, easing, callback) {
    if( time ) {
      var list = this;
      this.show();
      return animateFade(list, true, time, easing, callback || function () {});
    }

    for( var i = 0, n = this.length; i < n ; i++ ) {
      if( this[i].style.display ) {
        this[i].style.display = '';
      }
    }
    return this;
  };

  ListDOM.prototype.hide = function (time, easing, callback) {
    if( time ) {
      return animateFade(this, false, time, easing, function () {
        this.hide();
        if( callback ) {
          callback.call(this);
        }
      });
    }

    for( var i = 0, n = this.length; i < n ; i++ ) {
      this[i].style.display = 'none';
    }
    return this;
  };



  ListDOM.prototype.prop = function (key, value) {
      var i, len;

      if( _isFunction(value) ) {
        for( i = 0, len = this.length; i < len ; i++ ) {
          this[i][key] = value( i, this[i][key] );
        }
      } else if( value !== undefined ) {
        for( i = 0, len = this.length; i < len ; i++ ) {
          this[i][key] = value;
        }
      } else if( this[0] ) {
        return this[0][key];
      }
      return this;
    };

  ListDOM.prototype.val = function (value) {
      var element;
      if( value === undefined ) {
        element = this[0];
        if( element.nodeName === 'select' ) {
          return element.options[element.selectedIndex].value;
        } else {
          return ( this[0].value || this[0].getAttribute('value') );
        }
      } else {
        for( var i = 0, len = this.length; i < len ; i++ ) {
          if( this[i].nodeName === 'select' ) {
            element = this[i];
            for( var j = 0, len2 = element.options.length; j < len2 ; j++ ) {
              if( element.options[j].value === value ) {
                element.options[j].selected = true;
                break;
              }
            }
          } else if (this[i].value !== undefined) {
            this[i].value = value;
          } else {
            this[i].setAttribute('value', value);
          }
        }
      }
      return this;
    };

  var classListHas = classListEnabled ? function (el, className) {
        return el.classList.contains(className);
      } : function (el, className) {
        return new RegExp('\\b' + (className || '') + '\\b','').test(el.className);
      },
      classListAdd = classListEnabled ? function (el, className) {
        el.classList.add(className);
      } : function (el, className) {
        if( !classListHas(el, className) ) {
          el.className += ' ' + className;
        }
      },
      classListRemove = classListEnabled ? function (el, className) {
        el.classList.remove(className);
      } : function (el, className) {
        el.className = el.className.replace(new RegExp('\\s*' + className + '\\s*','g'), ' ');
      };

  ListDOM.prototype.addClass = function (className) {
      var i, n;

      if( className instanceof Function ) {
        for( i = 0, n = this.length; i < n ; i++ ) {
          classListAdd(this[i], className.call(this[i], i, this[i].className) );
        }
      } else if( className.indexOf(' ') >= 0 ) {
        className.split(/\s+/).forEach(function (_className) {
          for( var i = 0, n = this.length; i < n ; i++ ) {
            classListAdd(this[i], _className);
          }
        }.bind(this) );
      } else {
        for( i = 0, n = this.length; i < n ; i++ ) {
          classListAdd(this[i], className);
        }
      }

      return this;
    };

  ListDOM.prototype.removeClass = function (className) {
      var i, n;

      if( className instanceof Function ) {
        for( i = 0, n = this.length; i < n ; i++ ) {
          classListRemove(this[i], className.call(this[i], i, this[i].className) );
        }
      } else if( className.indexOf(' ') >= 0 ) {
        className.split(/\s+/).forEach(function (_className) {
          for( var i = 0, n = this.length; i < n ; i++ ) {
            classListRemove(this[i], _className);
          }
        }.bind(this) );
      } else {
        for( i = 0, n = this.length; i < n ; i++ ) {
          classListRemove(this[i], className);
        }
      }
      return this;
    };

  ListDOM.prototype.hasClass = function (className) {
      for( var i = 0, n = this.length; i < n ; i++ ) {
        if( classListHas(this[i], className) ) {
          return true;
        }
      }
      return false;
    };

  ListDOM.prototype.toggleClass = function (className, state) {
      var i, n, _state, _className;

      if( className instanceof Function ) {

        for( i = 0, n = this.length; i < n ; i++ ) {
          _className = className.call(this[i], i, this[i].className, state);
          _state = state === undefined ? !classListHas(this[i], _className) : state;
          ( _state ? classListAdd : classListRemove )(this[i], _className);
        }

      } else if( className.indexOf(' ') >= 0 ) {

        className.split(/\s+/).forEach(function (_className) {
          for( i = 0, n = this.length; i < n ; i++ ) {
            _state = state === undefined ? !classListHas(this[i], _className) : state;
            ( _state ? classListAdd : classListRemove )(this[i], _className);
          }
        }.bind(this) );

      } else {
        for( i = 0, n = this.length; i < n ; i++ ) {
          _state = state === undefined ? !classListHas(this[i], className) : state;
          ( _state ? classListAdd : classListRemove )(this[i], className);
        }
      }

      return this;
    };



  ListDOM.prototype.append = function (content) {
      var jContent = $(content), jContent2, i, j, len, len2, element;

      jContent.remove();

      for( i = 0, len = this.length; i < len; i++ ) {
        jContent2 = ( i ? jContent.clone(true) : jContent );
        element = this[i];
        for( j = 0, len2 = jContent2.length; j < len2; j++ ) {
          element.appendChild(jContent2[j]);
        }
      }

      return this;
    };

  // finally

  jqlite.noConflict = function () {
    if( root.$ === jqlite ) {
      delete root.$;
    }
    return jqlite;
  };

  function containsFallback( container, contained ) {
    contained = contained.parentnode || contained.parentElement;

    while( contained ) {
      if( contained === container ) {
        return true;
      }
      contained = contained.parentnode || contained.parentElement;
    }
    return false;
  }
  
  // compatible with: https://api.jquery.com/jQuery.contains/
  jqlite.contains = function (container, contained) {
    if( arguments.length < 2 ) {
      throw new Error('2 arguments required');
    }

      return container.contains ? container.contains(contained) : containsFallback(container, contained);
  };

  return jqlite;

});
/* observablejs: PaulKinlan/observables-js */
(function(i){var a;a=function(b,g,e){var c,d,h,f;d=this.changeListeners=[];g.__defineGetter__(b,function(){return c});g.__defineSetter__(b,function(a){h=g[b]||a;c=a;for(f=0;f<d.length;f+=1)d[f].call(g,a,h),"function"===typeof e&&e(a,h)})};a.prototype.addChangeListener=function(b){this.changeListeners.push(b)};a.prototype.removeChangeListener=function(b){this.changeListeners=this.changeListeners.splice(this.changeListeners.indexOf(b),1)};i.Observable=a;i.OnAnyChange=function(b,a){var e,c,d;e=function(b){"function"===
typeof a&&a(b)};for(c=0;c<b.length;c+=1)d=b[c],d.addChangeListener(e)}})(window);
