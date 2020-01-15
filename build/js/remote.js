;(function () {

  var MEJSX = function () {

    function getType(o) {
      return ({}).toString.call(o);
    }

    // Detect if the browser is Edge
    function isEDGE(){
      return /Edge\/\d./i.test(navigator.userAgent)
    }

    var getCustomCssRulesOnElement = function (elm) {
      var slice = Function.call.bind(Array.prototype.slice);

      var isCssMediaRule = function(cssRule) {
        if(isEDGE()) {
          return getType(cssRule) === '[object CSSMediaRule]';
        }
        return cssRule.type === cssRule.MEDIA_RULE;
      }

      var isCssStyleRule = function(cssRule) {
        if(isEDGE()) {
          return getType(cssRule) === '[object CSSStyleRule]';
        }
        return cssRule.type === cssRule.STYLE_RULE;
      }

      // Here we get the cssRules across all the stylesheets in one array
      var cssRules = slice(document.styleSheets).reduce(function (rules, styleSheet) {
        return rules.concat(slice(styleSheet.cssRules));
      }, []);

      var mediaRules = cssRules.filter(isCssMediaRule);

      cssRules = cssRules.filter(isCssStyleRule);

      cssRules = cssRules.concat(slice(mediaRules).reduce(function (rules, mediaRule) {
        return rules.concat(slice(mediaRule.cssRules));
      }, []));

      // get only the css rules that matches that element
      var rulesOnElement = cssRules.filter(isElementMatchWithCssRule.bind(null, elm));
      var elementRules = [];
      var elementRule = function (order, content, media) {
        if (media === undefined || media == null || media == '') {
          media = 'all';
        }
        this.order = order;
        this.content = content.replace(/\r/g,'').replace(/; /g, ";\n  ").replace(/ \{ /g, " { \n  ").replace(/\n  \}/g, "\n}").trim() + "\n";
        this.media = media;
      }
      if (rulesOnElement.length) {
        for (var i = 0; i < rulesOnElement.length; i++) {
          var e = rulesOnElement[i];
          var order = i;
          var content = e.cssText;
          var media = e.parentRule == null
            ? e.parentStyleSheet == null
              ? 'all'
              : e.parentStyleSheet.media.mediaText
            : e.parentRule.media.mediaText;

          var _elementRule = new elementRule(order, content, media);
          elementRules.push(_elementRule);
        }
      }

      if (elm.getAttribute('style')) {
        var _elementRule = new elementRule(rulesOnElement.length, 'style {  ' + elm.getAttribute('style') + '\n}')
        elementRules.push(_elementRule);
      }
      return elementRules;
    };

    var isElementMatchWithCssRule = function (element, cssRule) {

      var proto = Element.prototype;
      var matches = Function.call.bind(proto.matchesSelector ||
        proto.mozMatchesSelector || proto.webkitMatchesSelector ||
        proto.msMatchesSelector || proto.oMatchesSelector);
      try {
        return matches(element, cssRule.selectorText);
      } catch(err) {
        return false;
      }
    };

    return {
      getCustomCssRulesOnElement: function (element) {
        return getCustomCssRulesOnElement(element);
      }
    }

  }()

  /* jshint browser:true, evil:true */

  // 1. create iframe pointing to script on jsconsole.com domain
  // 2. create console object with: log, dir, etc?
  // 3. console.log runs postMessage with json.stringified content
  // 4. jsconsole.com/remote/?id.onMessage = send to server, and wait for response.

  function sortci(a, b) {
    return a < b? -1 : 1;
  }

  function nextId() {
    nextId.id = nextId.id || 0;
    return ++nextId.id;
  }

  var head = document.querySelector("head");
  var style = document.createElement("style");
  style.setAttribute('rel','stylesheet');
  style.textContent = '.__remotejsconsole_highlighted_relative { position:relative; } .__remotejsconsole_highlighted:after { content: " "; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,255,0.5);  } ';
  head.appendChild(style);

  var maxDepth = 3;

  // from console.js
  function stringify(o, depth, ignoreMaxDepth) {
    depth = depth || 0;
    var json = '', i, type = ({}).toString.call(o), parts = [], names = [];

    if (o instanceof ExpandedArray) {
      type = '[object ExpandedArray]';
    }
    if (o instanceof ExpandedObject) {
      type = '[object ExpandedObject]';
    }

    if (type === '[object String]') {
      json = '"' + o.replace(/\n/g, '\\n').replace(/\r/g,'').replace(/"/g, '\\"') + '"';
    } else if (type === '[object Array]') {
      json = '[';
      for (i = 0; i < o.length; i++) {
        if (depth < maxDepth || ignoreMaxDepth) {
          parts.push(stringify(o[i], depth+1, ignoreMaxDepth));
        } else {
          parts.push('T("[object Error]", { message: "End of inspection depth" } )');
        }
      }
      json += parts.join(', ') + ']';
    } else if (type === '[object Object]') {
      json = '{';
      for (i in o) {
        names.push(i);
      }
      names.sort(sortci);
      for (i = 0; i < names.length; i++) {
        if (depth < maxDepth || ignoreMaxDepth) {
          parts.push('"'+names[i]+'": ' + stringify(o[names[i] ], depth+1, ignoreMaxDepth));
        } else {
          parts.push('"'+names[i] + '": T("[object Error]", { message: "End of inspection depth" } )');
        }
      }
      json += parts.join(', ') + '}';
    } else if (type === '[object Number]') {
      json = o+'';
    } else if (type === '[object Boolean]') {
      json = o ? 'true' : 'false';
    } else if (type === '[object Function]') {
      json = "T('"+type+"','"+o.toString().replace(/^\s*(function[^\(]*\([^\)]*\))([^]+)$/, "$1{}")+"')";
    } else if (o === null) {
      json = 'null';
    } else if (o === undefined) {
      json = 'undefined';
    } else {
      if (o instanceof HTMLElement) {
        o.__remotejsconsole_id = o.__remotejsconsole_id || nextId();
        var attrs = [];
        for (let i = 0, l = o.attributes.length; i < l; i++) {
          var attr = o.attributes[i];
          attrs.push(attr.name+'="'+attr.value+'"');
        }
        o.__remotejsconsole_preview = "<"+o.tagName.toLowerCase()+(attrs.length?' ':'')+attrs.join(' ')+">";
        o.__remotejsconsole_resolution = o.clientWidth+" x "+o.clientHeight;
        json = "T('"+type+"', {\n";
      } else {
        json = "T('"+type+"', {\n";
      }
      for (i in o) {
        names.push(i);
      }
      names.sort(sortci);
      for (i = 0; i < names.length; i++) {
        // safety from max stack
        if (depth < maxDepth || names[i] === "__remotejsconsole_preview" || names[i] === "__remotejsconsole_id" || names[i] === "__remotejsconsole_resolution") {
          try {
            parts.push('"'+names[i] + '": ' + stringify(o[names[i]], depth+1, ignoreMaxDepth));
          } catch(err) {
            parts.push('"'+names[i] + '": ' + stringify(err, depth+1, ignoreMaxDepth));
          }
        } else {
          parts.push('"'+names[i] + '": T("[object Error]", { message: "End of inspection depth" } )');
        }
      }
      json += parts.join(',\n') + '\n})';
    }
    return json;
  }

  function getRemoteScript() {
    var scripts = document.getElementsByTagName('script');
    var remoteScript = scripts[scripts.length-1];
    var re = /js\/remote.js/;
    for (var i = 0; i < scripts.length; i++) {
      if (re.test(scripts[i].src)) {
        remoteScript = scripts[i];
        break;
      }
    }

    return remoteScript;
  }

  var last = getRemoteScript();

  var lastSrc = last.getAttribute('src');
  var id = lastSrc.replace(/.*\?/, '');
  var protocol = /https?:\/\//.exec(lastSrc)[0];
  var origin = protocol + lastSrc.substr(protocol.length).replace(/\/.*$/, '');
  var msgType = '';
  var uri = lastSrc.replace(/\?.*/,"").split("/").slice(0,-2).join("/");

  var script = document.createElement("script");
  script.src = uri+"/js/EventSource.js";
  document.querySelector("head").appendChild(script); 

  function sendMessage(msg, origin) {
    if (msg === '__init__' || typeof msg !== 'string') {
      return;
    }
    var xhr = new XMLHttpRequest();
    var params = 'data=' + encodeURIComponent(msg);
    xhr.open('POST', uri+'/remote/' + id + '/log', true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(params);
  }

  setTimeout(function () {
    var sse = new EventSource(uri+'/remote/' + id + '/run');
    sse.addEventListener("message", function (event) {
      receiveMessage({
        payload: event.data,
        silent: false
      });
    });
    sse.addEventListener("silent", function (event) {
      receiveMessage({
        payload: event.data,
        silent: true
      });
    });
  }, 13);

  var silent = false;

  function receiveMessage(msg) {

    // this isn't for us
    if (typeof msg !== "object" || typeof msg.payload !== 'string') {
      return;
    }

    var payload = msg.payload;

    silent = Boolean(msg.silent);
    var functionName = !silent ? 'echo' : 'silent';

    // eval the payload command
    try {
      remote[functionName](eval(payload), payload);
    } catch (e) {
      silent = false;
      _console.log(e.stack, event);
      remote.error(e.message+"\n"+e.stack, msg);
    }

    silent = false;

  }

  var timers = {}; // timers for console.time and console.timeEnd

  var highlightedElement;
  var inCapture = false;

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

  window.$_ = document.body;

  var remote = {
    size: function(selector) {
      var element;
      if (typeof selector === "number") {
        element = remote.fetchElementByJSConsoleId(selector);
      } else if (typeof selector === "string") {
        element = document.querySelector(selector);
      } else {
        element = selector;
      }
      var size = element.getBoundingClientRect();
      var computed = window.getComputedStyle(element);
      var rtn = new ExpandedObject();
      var BoundingClientRect = new Object();
      for (var k in size) BoundingClientRect[k] = size[k];
      var ComputedStyle = new ExpandedObject();
      ComputedStyle.boxSizing = computed.boxSizing;
      ComputedStyle.display = computed.display;
      ComputedStyle.position = computed.position;
      ComputedStyle.height = computed.height;
      ComputedStyle.width = computed.width;
      ComputedStyle.top = computed.top;
      ComputedStyle.left = computed.left;
      ComputedStyle.bottom = computed.bottom;
      ComputedStyle.right = computed.right;
      ComputedStyle.margin = computed.margin;
      ComputedStyle.border = computed.border;
      ComputedStyle.padding = computed.padding;

      rtn.BoundingClientRect = BoundingClientRect;
      rtn.ComputedStyle = ComputedStyle;
      return rtn;
    },
    cssRules: function(selector) {
      var element;
      if (typeof selector === "number") {
        element = remote.fetchElementByJSConsoleId(selector);
      } else if (typeof selector === "string") {
        element = document.querySelector(selector);
      } else {
        element = selector;
      }
      if (!element) return undefined;
      var rules = MEJSX.getCustomCssRulesOnElement(element);
      rules = rules.map(function(rule) {
        return rule.content;
      });
      return rules.reverse().join("\n");
    },
    styles: function(selector) {
      var element;
      if (typeof selector === "number") {
        element = remote.fetchElementByJSConsoleId(selector);
      } else if (typeof selector === "string") {
        element = document.querySelector(selector);
      } else {
        element = selector;
      }
      if (!element) return undefined;

      var computed = window.getComputedStyle(element);
      var normalElement = document.createElement(element.tageName);
      document.body.appendChild(normalElement);
      var normal = window.getComputedStyle(normalElement);

      var rtn = new ExpandedObject();
      var ComputedStyle = new Object();
      for (var k in computed) {
        if (isFinite(k)) continue;
        ComputedStyle[k] = computed[k];
      }
      var ModifiedStyle = new ExpandedObject();
      for (var k in normal) {
        if (computed[k] === normal[k]) continue;
        ModifiedStyle[k] = computed[k];
      }
      rtn.ModifiedStyle = ModifiedStyle;
      rtn.ComputedStyle = ComputedStyle;
      document.body.removeChild(normalElement);
      return rtn;

    },
    capture: function(selector) {
      if (selector) {
        var elements = [].slice.call(document.querySelectorAll(selector));
        if (!elements.length) {
          return undefined;
        }
        if (elements.length === 1) {
          window.$_ = elements[0];
          return elements[0];
        }
        if (elements.length > 60) {
          elements = elements.slice(0,60);
          elements.push("truncated...");
        }
        return elements;
      }
      if (inCapture) {
        document.body.removeEventListener("click", inCapture, {
          capture: true,
          passive: false
        });
        inCapture = false;
        return "Stopped capture.";
      }
      inCapture = function handler(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        document.body.removeEventListener("click", handler, {
          capture: true,
          passive: false
        });
        inCapture = false;
        window.$_ = e.target;
        remote.log(e.target);
      }
      document.body.addEventListener("click", inCapture, {
        capture: true,
        passive: false
      });
      return "Click on an element to capture...";
    },
    inspect: function(target, type) {
      if (typeof target === "number") {
        target = remote.fetchElementByJSConsoleId(target);
      }
      switch (type) {
        case "parents":
          var parents = new ExpandedArray();
          var parent =  target;
          while (parent = parent.parentNode) parents.push(parent);
          return parents;
        case "descendents":
          var descendents = [].slice.call(target.querySelectorAll("*"), 0);
          if (descendents.length > 20) {
            descendents = descendents.slice(0,20);
            descendents.push("truncated...");
          }
          var rtn = new ExpandedArray();
          rtn.push.apply(rtn, descendents);
          return rtn;
        case "children":
          var children = [].slice.call(target.children||[], 0);
          var rtn = new ExpandedArray();
          rtn.push.apply(rtn, children);
          return rtn;
        default:
          window.$_ = target;
          return target;
      }
    },
    fetchElementByJSConsoleId: function(remotejsconsole_id) {
      var elements = [].slice.call(document.querySelectorAll('*'), 0);
      var element;
      for (var i = 0, l = elements.length; i < l; i++) {
        if (elements[i].__remotejsconsole_id === remotejsconsole_id) {
          element = elements[i];
        }
      }
      return element;
    },
    highlight: function(remotejsconsole_id) {
      var element = remote.fetchElementByJSConsoleId(remotejsconsole_id);
      if (highlightedElement && element && highlightedElement.isSameNode(element)) return;
      if (highlightedElement) {

        highlightedElement.classList.remove("__remotejsconsole_highlighted");
        highlightedElement.classList.remove("__remotejsconsole_highlighted_relative");
        highlightedElement = null;
      }
      if (!element) return;
      highlightedElement = element;
      if (!window.getComputedStyle(highlightedElement).position) {
        highlightedElement.classList.add("__remotejsconsole_highlighted_relative");
      }
      highlightedElement.classList.add("__remotejsconsole_highlighted");
    },
    log: function () {
      var args = [].slice.call(arguments, 0);
      args = args.concat(['remote console.log'])
      this.echo.apply(this, args);
      msgType = '';
    },
    info: function () {
      msgType = 'info';
      remote.log.apply(this, arguments);
    },
    echo: function () {
      var args = [].slice.call(arguments, 0),
          cmd = args.pop(),
          response = args;

      var argsObj = stringify(response, undefined),
          msg = JSON.stringify({ response: argsObj, cmd: cmd, type: msgType });
      sendMessage(msg);
    },
    silent: function() {
      var args = [].slice.call(arguments, 0),
          cmd = args.pop(),
          response = args;

      var argsObj = stringify(response, undefined),
          msg = JSON.stringify({ response: argsObj, cmd: cmd, type: msgType, silent: true });
      sendMessage(msg, origin);
    },
    error: function (error, cmd) {
      var msg = JSON.stringify({ response: error, cmd: cmd, type: 'error' });
      sendMessage(msg, origin);
    },
    time: function(title){
      if(typeof title !== 'string') {
        return;
      }
      timers[title] = +new Date();
    },
    timeEnd: function(title){
      if (typeof title !== 'string' || !timers[title]) {
        return;
      }
      var execTime = +new Date() - timers[title];
      delete timers[title];
      var plain = title + ': ' + execTime + 'ms';
      var msg = JSON.stringify({ response: plain, cmd:  'remote console.log', type: '' });
      sendMessage(msg, origin);
    },
    assert: function(condition, object){
      if(!condition) {
        remote.log(arguments.length);
        var message = 'Assertion failed';
        if (object) {
          message += ': ' + stringify(object);
        }
        remote.log(message)
        remote.error({ message: message });
      }
    }
  };

  // just for extra support
  remote.debug = remote.dir = remote.log;
  remote.warn = remote.info;

  sendMessage(stringify({ response: 'Connection established with ' + window.location.toString() + '\n' + navigator.userAgent, type: 'info' }));

  window.remote = remote;

  if (window.addEventListener) {
    window.addEventListener('error', function (event) {
      remote.error({ message: event.message }, event.filename + ':' + event.lineno);
    }, false);
  }


  try {
    window._console = window.console;
    window.console = remote;
  } catch (e) {
    console.log('cannot overwrite existing console object');
  }

  function warnUsage() {
    var useSS = false;
    try {
      sessionStorage.getItem('foo');
      useSS = true;
    } catch (e) {}
    if (!(useSS ? sessionStorage.remotejsconsole : window.name)) {
      if (useSS) {
        sessionStorage.remotejsconsole = 1;
      } else {
        window.name = 1;
      }
      alert('You will see this warning once per session.\n\nYou are using a remote control script on this site - if you accidently push it to production, anyone will have control of your visitor\'s browser. Remember to remove this script.');
    }
  }

  warnUsage();

  })();