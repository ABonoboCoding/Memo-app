(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ]

    var isDataView = function(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj)
    }

    var isArrayBufferView = ArrayBuffer.isView || function(obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
    }
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1])
      }, this)
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var oldValue = this.map[name]
    this.map[name] = oldValue ? oldValue+','+value : value
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    name = normalizeName(name)
    return this.has(name) ? this.map[name] : null
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value)
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this)
      }
    }
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsArrayBuffer(blob)
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsText(blob)
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf)
    var chars = new Array(view.length)

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i])
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength)
      view.set(new Uint8Array(buf))
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (!body) {
        this._bodyText = ''
      } else if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer)
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer])
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body)
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      }
    }

    this.text = function() {
      var rejected = consumed(this)
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = String(input)
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit })
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers()
    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
    // https://tools.ietf.org/html/rfc7230#section-3.2
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ')
    preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':')
      var key = parts.shift().trim()
      if (key) {
        var value = parts.join(':').trim()
        headers.append(key, value)
      }
    })
    return headers
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = options.status === undefined ? 200 : options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = 'statusText' in options ? options.statusText : 'OK'
    this.headers = new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init)
      var xhr = new XMLHttpRequest()

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        }
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL')
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      } else if (request.credentials === 'omit') {
        xhr.withCredentials = false
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
// Camera utility - based on https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Taking_still_photos

var width = 0;
var height = 0;
var streaming = false;

var video = null;
var canvas = null;
var startbutton = null;

var photoCallback = null;

function setup() {
	var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};


	width = config.width || screen.width;

	photoCallback = config.callback;

	video = document.getElementById('camera-view');
	canvas = document.getElementById('canvas');
	startbutton = document.getElementById('take-photo-btn');
	document.getElementById('save-photo-btn').addEventListener('click', function (evt) {
		evt.preventDefault();
		savePhoto();
	});
	document.getElementById('reject-photo-btn').addEventListener('click', function (evt) {
		evt.preventDefault();
		rejectPhoto();
	});

	navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(function (stream) {
		video.srcObject = stream;
		video.play();
	}).catch(function (err) {
		console.error('Error getting video', err);
	});

	video.addEventListener('canplay', function (evt) {
		if (!streaming) {
			height = video.videoHeight / (video.videoWidth / width);
			video.setAttribute('width', width);
			video.setAttribute('height', height);
			canvas.setAttribute('width', width);
			canvas.setAttribute('height', height);
			streaming = true;
		}
	}, false);

	startbutton.addEventListener('click', function (evt) {
		evt.preventDefault();
		takePicture();
	}, false);

	clearPhoto();
}

function clearPhoto() {
	var context = canvas.getContext('2d');
	context.fillStyle = '#AAA';
	context.fillRect(0, 0, canvas.width, canvas.height);

	canvas.parentNode.classList.remove('camera__preview');
}

function takePicture() {
	var context = canvas.getContext('2d');
	if (width && height) {
		canvas.width = width;
		canvas.height = height;
		context.drawImage(video, 0, 0, width, height);

		canvas.parentNode.classList.add('camera__preview');
	} else {
		clearPhoto();
	}
}

function savePhoto() {
	var data = canvas.toDataURL('image/png');

	if (photoCallback) {
		photoCallback(data);
	}

	canvas.parentNode.classList.remove('camera__preview');
}

function rejectPhoto() {
	clearPhoto();
	canvas.parentNode.classList.remove('camera__preview');
}

exports.default = setup;

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Gallery = function () {
	function Gallery() {
		var target = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '#gallery';
		var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		_classCallCheck(this, Gallery);

		// Convert target selector to element if it is a string
		this.target = typeof target === 'string' ? document.querySelector(target) : target;

		this.maxCount = options.maxCount || 6;
		this.photos = [];
	}

	_createClass(Gallery, [{
		key: 'addPhoto',
		value: function addPhoto(src) {
			var _this = this;

			this.photos.push(src);

			var image = new Image();
			image.addEventListener('load', function () {
				var data = {
					src: src,
					width: image.width,
					height: image.height,
					image: image
				};
				_this.photos.push(data);
				_this.showPhoto(data);
			});
			image.src = src;
		}

		/**
   * Display the photo in the gallary
   * @param {Object} photoData Available data on the image;
   * @param {Image} photoData.image The image element to display
   * @param {number} photoData.width Image width in pixels
   * @param {number} photoData.height Image height in pixels
   **/

	}, {
		key: 'showPhoto',
		value: function showPhoto(photoData) {
			var image = photoData.image;
			image.className = 'gallery__image';
			// Insert in first position
			if (this.target.children.length) {
				this.target.insertBefore(image, this.target.firstChild);

				// If we have reached max length remove the last element
				if (this.target.children.length > this.maxCount) {
					var last = this.target.children[this.target.children.length - 1];
					this.target.removeChild(last);

					// Remove refence to element now it is removed
					var lastIndex = this.photos.findIndex(function (photo) {
						return photo.image === last;
					});
					console.log('Index', lastIndex);
					if (lastIndex) {
						this.photos[lastIndex].image = null;
					}
				}
			} else {
				this.target.appendChild(image);
			}
			this.scalePhotos(photoData);
		}

		/**
   * Scale the image width to match the current height
   **/

	}, {
		key: 'scalePhotos',
		value: function scalePhotos() {
			var activeImages = this.photos.filter(function (photo) {
				return photo.image;
			});
			var parentSize = this.target.getBoundingClientRect();

			// Reset sizes
			activeImages.forEach(function (photo) {
				photo.image.width = photo.width;
				photo.image.height = photo.height;

				var scale = photo.width / photo.height;
				if (photo.image.width / photo.image.height !== scale) {
					// Fix scale
					var image = photo.image;
					image.height = parentSize.height;
					image.width = parentSize.height * scale;
				}
			});
		}
	}]);

	return Gallery;
}();

exports.default = Gallery;

},{}],4:[function(require,module,exports){
'use strict';

require('whatwg-fetch');

var _camera = require('./camera');

var _camera2 = _interopRequireDefault(_camera);

var _gallery = require('./gallery');

var _gallery2 = _interopRequireDefault(_gallery);

var _storage = require('./storage');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var gallery = new _gallery2.default();

(0, _storage.connect)().then(function () {
	return (0, _storage.getAllPhotos)();
}).then(function (photos) {
	return photos.forEach(function (photo) {
		return gallery.addPhoto(photo);
	});
}).catch(function (err) {
	return console.error(err);
});

function photoCallback(photo) {
	gallery.addPhoto(photo);
	(0, _storage.savePhoto)(photo);
}

(0, _camera2.default)({ callback: photoCallback });

},{"./camera":2,"./gallery":3,"./storage":5,"whatwg-fetch":1}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var dbName = 'photos';
var dbVersion = 1;
var photoStore = 'photos';

var connected = null;

function connect() {
	if (connected) {
		return connected;
	}

	connected = new Promise(function (resolve, reject) {
		var conn = indexedDB.open(dbName, dbVersion);

		conn.addEventListener('success', function (evt) {

			var db = evt.target.result;
			resolve(evt.target.result);
		});

		conn.addEventListener('error', function (evt) {
			return reject(evt.target.error);
		});

		conn.addEventListener('upgradeneeded', function (evt) {
			var db = evt.target.result;
			var objectStore = db.createObjectStore(photoStore, {
				keyPath: "id",
				autoIncrement: true
			});
		});
	});
	return connected;
}

function getAllPhotos() {
	return connect().then(function (db) {
		return new Promise(function (resolve, reject) {
			console.log('Get all photos');
			var photos = [];
			var store = db.transaction([photoStore]).objectStore(photoStore);
			var cursor = store.openCursor();
			cursor.addEventListener('success', function (evt) {
				var thisCursor = evt.target.result;
				if (thisCursor) {
					var data = thisCursor.value;
					photos.push(data.src);
					thisCursor.continue();
				} else {
					resolve(photos);
				}
			});

			cursor.addEventListener('error', function (evt) {
				return reject(evt.target.error);
			});
		});
	});
}

function savePhoto(src) {
	return connect().then(function (db) {
		return new Promise(function (resolve, reject) {
			var transaction = db.transaction([photoStore], 'readwrite');
			var objectStore = transaction.objectStore(photoStore);
			var request = objectStore.add({
				src: src
			});
			request.addEventListener('success', function (evt) {
				return resolve(evt.target.result);
			});
			request.addEventListener('error', function (evt) {
				return resolve(evt.target.error);
			});
		});
	});
}

exports.connect = connect;
exports.getAllPhotos = getAllPhotos;
exports.savePhoto = savePhoto;

},{}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2ZldGNoLmpzIiwic3JjL2pzL2NhbWVyYS5qcyIsInNyYy9qcy9nYWxsZXJ5LmpzIiwic3JjL2pzL3N0YXJ0LmpzIiwic3JjL2pzL3N0b3JhZ2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7O0FDbGRBOztBQUVBLElBQUksUUFBUSxDQUFaO0FBQ0EsSUFBSSxTQUFTLENBQWI7QUFDQSxJQUFJLFlBQVksS0FBaEI7O0FBRUEsSUFBSSxRQUFRLElBQVo7QUFDQSxJQUFJLFNBQVMsSUFBYjtBQUNBLElBQUksY0FBYyxJQUFsQjs7QUFFQSxJQUFJLGdCQUFnQixJQUFw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QVQ7QUFBQSxJQUFqQztBQUNBLEdBakJNLENBQVA7QUFrQkEsRUFwQkssQ0FBUDtBQXFCQTs7QUFFRCxTQUFTLFNBQVQsQ0FBbUIsR0FBbkIsRUFBd0I7QUFDdkIsUUFBTyxVQUNMLElBREssQ0FDQSxVQUFDLEVBQUQsRUFBUTtBQUNiLFNBQU8sSUFBSSxPQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtBQUN2QyxPQUFNLGNBQWMsR0FBRyxXQUFILENBQWUsQ0FBQyxVQUFELENBQWYsRUFBNkIsV0FBN0IsQ0FBcEI7QUFDQSxPQUFNLGNBQWMsWUFBWSxXQUFaLENBQXdCLFVBQXhCLENBQXBCO0FBQ0EsT0FBTSxVQUFVLFlBQVksR0FBWixDQUFnQjtBQUMvQjtBQUQrQixJQUFoQixDQUFoQjtBQUdBLFdBQVEsZ0JBQVIsQ0FBeUIsU0FBekIsRUFBb0MsVUFBQyxHQUFEO0FBQUEsV0FBUyxRQUFRLElBQUksTUFBSixDQUFXLE1BQW5CLENBQVQ7QUFBQSxJQUFwQztBQUNBLFdBQVEsZ0JBQVIsQ0FBeUIsT0FBekIsRUFBa0MsVUFBQyxHQUFEO0FBQUEsV0FBUyxRQUFRLElBQUksTUFBSixDQUFXLEtBQW5CLENBQVQ7QUFBQSxJQUFsQztBQUNBLEdBUk0sQ0FBUDtBQVNBLEVBWEssQ0FBUDtBQVlBOztRQUdBLE8sR0FBQSxPO1FBQ0EsWSxHQUFBLFk7UUFDQSxTLEdBQUEsUyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIihmdW5jdGlvbihzZWxmKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBpZiAoc2VsZi5mZXRjaCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHN1cHBvcnQgPSB7XG4gICAgc2VhcmNoUGFyYW1zOiAnVVJMU2VhcmNoUGFyYW1zJyBpbiBzZWxmLFxuICAgIGl0ZXJhYmxlOiAnU3ltYm9sJyBpbiBzZWxmICYmICdpdGVyYXRvcicgaW4gU3ltYm9sLFxuICAgIGJsb2I6ICdGaWxlUmVhZGVyJyBpbiBzZWxmICYmICdCbG9iJyBpbiBzZWxmICYmIChmdW5jdGlvbigpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5ldyBCbG9iKClcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9KSgpLFxuICAgIGZvcm1EYXRhOiAnRm9ybURhdGEnIGluIHNlbGYsXG4gICAgYXJyYXlCdWZmZXI6ICdBcnJheUJ1ZmZlcicgaW4gc2VsZlxuICB9XG5cbiAgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIpIHtcbiAgICB2YXIgdmlld0NsYXNzZXMgPSBbXG4gICAgICAnW29iamVjdCBJbnQ4QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQ4QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQ4Q2xhbXBlZEFycmF5XScsXG4gICAgICAnW29iamVjdCBJbnQxNkFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgRmxvYXQ2NEFycmF5XSdcbiAgICBdXG5cbiAgICB2YXIgaXNEYXRhVmlldyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiAmJiBEYXRhVmlldy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihvYmopXG4gICAgfVxuXG4gICAgdmFyIGlzQXJyYXlCdWZmZXJWaWV3ID0gQXJyYXlCdWZmZXIuaXNWaWV3IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiAmJiB2aWV3Q2xhc3Nlcy5pbmRleE9mKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopKSA+IC0xXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTmFtZShuYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgbmFtZSA9IFN0cmluZyhuYW1lKVxuICAgIH1cbiAgICBpZiAoL1teYS16MC05XFwtIyQlJicqKy5cXF5fYHx+XS9pLnRlc3QobmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgY2hhcmFjdGVyIGluIGhlYWRlciBmaWVsZCBuYW1lJylcbiAgICB9XG4gICAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKVxuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplVmFsdWUodmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgdmFsdWUgPSBTdHJpbmcodmFsdWUpXG4gICAgfVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgLy8gQnVpbGQgYSBkZXN0cnVjdGl2ZSBpdGVyYXRvciBmb3IgdGhlIHZhbHVlIGxpc3RcbiAgZnVuY3Rpb24gaXRlcmF0b3JGb3IoaXRlbXMpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSB7XG4gICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gaXRlbXMuc2hpZnQoKVxuICAgICAgICByZXR1cm4ge2RvbmU6IHZhbHVlID09PSB1bmRlZmluZWQsIHZhbHVlOiB2YWx1ZX1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgICAgaXRlcmF0b3JbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gaXRlcmF0b3JcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaXRlcmF0b3JcbiAgfVxuXG4gIGZ1bmN0aW9uIEhlYWRlcnMoaGVhZGVycykge1xuICAgIHRoaXMubWFwID0ge31cblxuICAgIGlmIChoZWFkZXJzIGluc3RhbmNlb2YgSGVhZGVycykge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKG5hbWUsIHZhbHVlKVxuICAgICAgfSwgdGhpcylcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaGVhZGVycykpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbihoZWFkZXIpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQoaGVhZGVyWzBdLCBoZWFkZXJbMV0pXG4gICAgICB9LCB0aGlzKVxuICAgIH0gZWxzZSBpZiAoaGVhZGVycykge1xuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoaGVhZGVycykuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKG5hbWUsIGhlYWRlcnNbbmFtZV0pXG4gICAgICB9LCB0aGlzKVxuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSlcbiAgICB2YWx1ZSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKVxuICAgIHZhciBvbGRWYWx1ZSA9IHRoaXMubWFwW25hbWVdXG4gICAgdGhpcy5tYXBbbmFtZV0gPSBvbGRWYWx1ZSA/IG9sZFZhbHVlKycsJyt2YWx1ZSA6IHZhbHVlXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSlcbiAgICByZXR1cm4gdGhpcy5oYXMobmFtZSkgPyB0aGlzLm1hcFtuYW1lXSA6IG51bGxcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGFzT3duUHJvcGVydHkobm9ybWFsaXplTmFtZShuYW1lKSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGZvciAodmFyIG5hbWUgaW4gdGhpcy5tYXApIHtcbiAgICAgIGlmICh0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHRoaXMubWFwW25hbWVdLCBuYW1lLCB0aGlzKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKG5hbWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUudmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHsgaXRlbXMucHVzaCh2YWx1ZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChbbmFtZSwgdmFsdWVdKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgSGVhZGVycy5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXSA9IEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXNcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYilcbiAgICByZXR1cm4gcHJvbWlzZVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICAgIHJlYWRlci5yZWFkQXNUZXh0KGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRBcnJheUJ1ZmZlckFzVGV4dChidWYpIHtcbiAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICB2YXIgY2hhcnMgPSBuZXcgQXJyYXkodmlldy5sZW5ndGgpXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZpZXcubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNoYXJzW2ldID0gU3RyaW5nLmZyb21DaGFyQ29kZSh2aWV3W2ldKVxuICAgIH1cbiAgICByZXR1cm4gY2hhcnMuam9pbignJylcbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1ZmZlckNsb25lKGJ1Zikge1xuICAgIGlmIChidWYuc2xpY2UpIHtcbiAgICAgIHJldHVybiBidWYuc2xpY2UoMClcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYuYnl0ZUxlbmd0aClcbiAgICAgIHZpZXcuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZikpXG4gICAgICByZXR1cm4gdmlldy5idWZmZXJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZVxuXG4gICAgdGhpcy5faW5pdEJvZHkgPSBmdW5jdGlvbihib2R5KSB7XG4gICAgICB0aGlzLl9ib2R5SW5pdCA9IGJvZHlcbiAgICAgIGlmICghYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5LnRvU3RyaW5nKClcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiBzdXBwb3J0LmJsb2IgJiYgaXNEYXRhVmlldyhib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5LmJ1ZmZlcilcbiAgICAgICAgLy8gSUUgMTAtMTEgY2FuJ3QgaGFuZGxlIGEgRGF0YVZpZXcgYm9keS5cbiAgICAgICAgdGhpcy5fYm9keUluaXQgPSBuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiAoQXJyYXlCdWZmZXIucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkgfHwgaXNBcnJheUJ1ZmZlclZpZXcoYm9keSkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAndGV4dC9wbGFpbjtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QmxvYiAmJiB0aGlzLl9ib2R5QmxvYi50eXBlKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgdGhpcy5fYm9keUJsb2IudHlwZSlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuYmxvYikge1xuICAgICAgdGhpcy5ibG9iID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKSlcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgYmxvYicpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keVRleHRdKSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gY29uc3VtZWQodGhpcykgfHwgUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICByZXR1cm4gcmVhZEJsb2JBc1RleHQodGhpcy5fYm9keUJsb2IpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlYWRBcnJheUJ1ZmZlckFzVGV4dCh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIHRleHQnKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5mb3JtRGF0YSkge1xuICAgICAgdGhpcy5mb3JtRGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihkZWNvZGUpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5qc29uID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihKU09OLnBhcnNlKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvLyBIVFRQIG1ldGhvZHMgd2hvc2UgY2FwaXRhbGl6YXRpb24gc2hvdWxkIGJlIG5vcm1hbGl6ZWRcbiAgdmFyIG1ldGhvZHMgPSBbJ0RFTEVURScsICdHRVQnLCAnSEVBRCcsICdPUFRJT05TJywgJ1BPU1QnLCAnUFVUJ11cblxuICBmdW5jdGlvbiBub3JtYWxpemVNZXRob2QobWV0aG9kKSB7XG4gICAgdmFyIHVwY2FzZWQgPSBtZXRob2QudG9VcHBlckNhc2UoKVxuICAgIHJldHVybiAobWV0aG9kcy5pbmRleE9mKHVwY2FzZWQpID4gLTEpID8gdXBjYXNlZCA6IG1ldGhvZFxuICB9XG5cbiAgZnVuY3Rpb24gUmVxdWVzdChpbnB1dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgdmFyIGJvZHkgPSBvcHRpb25zLmJvZHlcblxuICAgIGlmIChpbnB1dCBpbnN0YW5jZW9mIFJlcXVlc3QpIHtcbiAgICAgIGlmIChpbnB1dC5ib2R5VXNlZCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKVxuICAgICAgfVxuICAgICAgdGhpcy51cmwgPSBpbnB1dC51cmxcbiAgICAgIHRoaXMuY3JlZGVudGlhbHMgPSBpbnB1dC5jcmVkZW50aWFsc1xuICAgICAgaWYgKCFvcHRpb25zLmhlYWRlcnMpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMoaW5wdXQuaGVhZGVycylcbiAgICAgIH1cbiAgICAgIHRoaXMubWV0aG9kID0gaW5wdXQubWV0aG9kXG4gICAgICB0aGlzLm1vZGUgPSBpbnB1dC5tb2RlXG4gICAgICBpZiAoIWJvZHkgJiYgaW5wdXQuX2JvZHlJbml0ICE9IG51bGwpIHtcbiAgICAgICAgYm9keSA9IGlucHV0Ll9ib2R5SW5pdFxuICAgICAgICBpbnB1dC5ib2R5VXNlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51cmwgPSBTdHJpbmcoaW5wdXQpXG4gICAgfVxuXG4gICAgdGhpcy5jcmVkZW50aWFscyA9IG9wdGlvbnMuY3JlZGVudGlhbHMgfHwgdGhpcy5jcmVkZW50aWFscyB8fCAnb21pdCdcbiAgICBpZiAob3B0aW9ucy5oZWFkZXJzIHx8ICF0aGlzLmhlYWRlcnMpIHtcbiAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB9XG4gICAgdGhpcy5tZXRob2QgPSBub3JtYWxpemVNZXRob2Qob3B0aW9ucy5tZXRob2QgfHwgdGhpcy5tZXRob2QgfHwgJ0dFVCcpXG4gICAgdGhpcy5tb2RlID0gb3B0aW9ucy5tb2RlIHx8IHRoaXMubW9kZSB8fCBudWxsXG4gICAgdGhpcy5yZWZlcnJlciA9IG51bGxcblxuICAgIGlmICgodGhpcy5tZXRob2QgPT09ICdHRVQnIHx8IHRoaXMubWV0aG9kID09PSAnSEVBRCcpICYmIGJvZHkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JvZHkgbm90IGFsbG93ZWQgZm9yIEdFVCBvciBIRUFEIHJlcXVlc3RzJylcbiAgICB9XG4gICAgdGhpcy5faW5pdEJvZHkoYm9keSlcbiAgfVxuXG4gIFJlcXVlc3QucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXF1ZXN0KHRoaXMsIHsgYm9keTogdGhpcy5fYm9keUluaXQgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlY29kZShib2R5KSB7XG4gICAgdmFyIGZvcm0gPSBuZXcgRm9ybURhdGEoKVxuICAgIGJvZHkudHJpbSgpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihieXRlcykge1xuICAgICAgaWYgKGJ5dGVzKSB7XG4gICAgICAgIHZhciBzcGxpdCA9IGJ5dGVzLnNwbGl0KCc9JylcbiAgICAgICAgdmFyIG5hbWUgPSBzcGxpdC5zaGlmdCgpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJz0nKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICBmb3JtLmFwcGVuZChkZWNvZGVVUklDb21wb25lbnQobmFtZSksIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZm9ybVxuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VIZWFkZXJzKHJhd0hlYWRlcnMpIHtcbiAgICB2YXIgaGVhZGVycyA9IG5ldyBIZWFkZXJzKClcbiAgICAvLyBSZXBsYWNlIGluc3RhbmNlcyBvZiBcXHJcXG4gYW5kIFxcbiBmb2xsb3dlZCBieSBhdCBsZWFzdCBvbmUgc3BhY2Ugb3IgaG9yaXpvbnRhbCB0YWIgd2l0aCBhIHNwYWNlXG4gICAgLy8gaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzcyMzAjc2VjdGlvbi0zLjJcbiAgICB2YXIgcHJlUHJvY2Vzc2VkSGVhZGVycyA9IHJhd0hlYWRlcnMucmVwbGFjZSgvXFxyP1xcbltcXHQgXSsvZywgJyAnKVxuICAgIHByZVByb2Nlc3NlZEhlYWRlcnMuc3BsaXQoL1xccj9cXG4vKS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3BsaXQoJzonKVxuICAgICAgdmFyIGtleSA9IHBhcnRzLnNoaWZ0KCkudHJpbSgpXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHBhcnRzLmpvaW4oJzonKS50cmltKClcbiAgICAgICAgaGVhZGVycy5hcHBlbmQoa2V5LCB2YWx1ZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBoZWFkZXJzXG4gIH1cblxuICBCb2R5LmNhbGwoUmVxdWVzdC5wcm90b3R5cGUpXG5cbiAgZnVuY3Rpb24gUmVzcG9uc2UoYm9keUluaXQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cblxuICAgIHRoaXMudHlwZSA9ICdkZWZhdWx0J1xuICAgIHRoaXMuc3RhdHVzID0gb3B0aW9ucy5zdGF0dXMgPT09IHVuZGVmaW5lZCA/IDIwMCA6IG9wdGlvbnMuc3RhdHVzXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9ICdzdGF0dXNUZXh0JyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXNUZXh0IDogJ09LJ1xuICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB0aGlzLnVybCA9IG9wdGlvbnMudXJsIHx8ICcnXG4gICAgdGhpcy5faW5pdEJvZHkoYm9keUluaXQpXG4gIH1cblxuICBCb2R5LmNhbGwoUmVzcG9uc2UucHJvdG90eXBlKVxuXG4gIFJlc3BvbnNlLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UodGhpcy5fYm9keUluaXQsIHtcbiAgICAgIHN0YXR1czogdGhpcy5zdGF0dXMsXG4gICAgICBzdGF0dXNUZXh0OiB0aGlzLnN0YXR1c1RleHQsXG4gICAgICBoZWFkZXJzOiBuZXcgSGVhZGVycyh0aGlzLmhlYWRlcnMpLFxuICAgICAgdXJsOiB0aGlzLnVybFxuICAgIH0pXG4gIH1cblxuICBSZXNwb25zZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXNwb25zZSA9IG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiAwLCBzdGF0dXNUZXh0OiAnJ30pXG4gICAgcmVzcG9uc2UudHlwZSA9ICdlcnJvcidcbiAgICByZXR1cm4gcmVzcG9uc2VcbiAgfVxuXG4gIHZhciByZWRpcmVjdFN0YXR1c2VzID0gWzMwMSwgMzAyLCAzMDMsIDMwNywgMzA4XVxuXG4gIFJlc3BvbnNlLnJlZGlyZWN0ID0gZnVuY3Rpb24odXJsLCBzdGF0dXMpIHtcbiAgICBpZiAocmVkaXJlY3RTdGF0dXNlcy5pbmRleE9mKHN0YXR1cykgPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCBzdGF0dXMgY29kZScpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiBzdGF0dXMsIGhlYWRlcnM6IHtsb2NhdGlvbjogdXJsfX0pXG4gIH1cblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzXG4gIHNlbGYuUmVxdWVzdCA9IFJlcXVlc3RcbiAgc2VsZi5SZXNwb25zZSA9IFJlc3BvbnNlXG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uKGlucHV0LCBpbml0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgUmVxdWVzdChpbnB1dCwgaW5pdClcbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuXG4gICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgIHN0YXR1czogeGhyLnN0YXR1cyxcbiAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dCxcbiAgICAgICAgICBoZWFkZXJzOiBwYXJzZUhlYWRlcnMoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpIHx8ICcnKVxuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMudXJsID0gJ3Jlc3BvbnNlVVJMJyBpbiB4aHIgPyB4aHIucmVzcG9uc2VVUkwgOiBvcHRpb25zLmhlYWRlcnMuZ2V0KCdYLVJlcXVlc3QtVVJMJylcbiAgICAgICAgdmFyIGJvZHkgPSAncmVzcG9uc2UnIGluIHhociA/IHhoci5yZXNwb25zZSA6IHhoci5yZXNwb25zZVRleHRcbiAgICAgICAgcmVzb2x2ZShuZXcgUmVzcG9uc2UoYm9keSwgb3B0aW9ucykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9wZW4ocmVxdWVzdC5tZXRob2QsIHJlcXVlc3QudXJsLCB0cnVlKVxuXG4gICAgICBpZiAocmVxdWVzdC5jcmVkZW50aWFscyA9PT0gJ2luY2x1ZGUnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlXG4gICAgICB9IGVsc2UgaWYgKHJlcXVlc3QuY3JlZGVudGlhbHMgPT09ICdvbWl0Jykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gZmFsc2VcbiAgICAgIH1cblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0LmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiByZXF1ZXN0Ll9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogcmVxdWVzdC5fYm9keUluaXQpXG4gICAgfSlcbiAgfVxuICBzZWxmLmZldGNoLnBvbHlmaWxsID0gdHJ1ZVxufSkodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuIiwiLy8gQ2FtZXJhIHV0aWxpdHkgLSBiYXNlZCBvbiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvV2ViUlRDX0FQSS9UYWtpbmdfc3RpbGxfcGhvdG9zXG5cbmxldCB3aWR0aCA9IDA7XG5sZXQgaGVpZ2h0ID0gMDtcbmxldCBzdHJlYW1pbmcgPSBmYWxzZTtcblxubGV0IHZpZGVvID0gbnVsbDtcbmxldCBjYW52YXMgPSBudWxsO1xubGV0IHN0YXJ0YnV0dG9uID0gbnVsbDtcblxubGV0IHBob3RvQ2FsbGJhY2sgPSBudWxsO1xuXG5mdW5jdGlvbiBzZXR1cChjb25maWcgPSB7fSkge1xuXG5cdHdpZHRoID0gY29uZmlnLndpZHRoIHx8IHNjcmVlbi53aWR0aDtcblxuXHRwaG90b0NhbGxiYWNrID0gY29uZmlnLmNhbGxiYWNrO1xuXG5cdHZpZGVvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbWVyYS12aWV3Jyk7XG5cdGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKTtcblx0c3RhcnRidXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGFrZS1waG90by1idG4nKTtcblx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmUtcGhvdG8tYnRuJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZ0KSA9PiB7XG5cdFx0ZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0c2F2ZVBob3RvKCk7XG5cdH0pO1xuXHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVqZWN0LXBob3RvLWJ0bicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2dCkgPT4ge1xuXHRcdGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdHJlamVjdFBob3RvKCk7XG5cdH0pO1xuXG5cdG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHt2aWRlbzogdHJ1ZSwgYXVkaW86IGZhbHNlfSlcblx0XHQudGhlbigoc3RyZWFtKSA9PiB7XG5cdFx0XHR2aWRlby5zcmNPYmplY3QgPSBzdHJlYW07XG5cdFx0XHR2aWRlby5wbGF5KCk7XG5cdFx0fSlcblx0LmNhdGNoKChlcnIpID0+IHtcblx0XHRjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHZpZGVvJywgZXJyKTtcblx0fSk7XG5cblx0dmlkZW8uYWRkRXZlbnRMaXN0ZW5lcignY2FucGxheScsIChldnQpID0+IHtcblx0XHRpZighc3RyZWFtaW5nKSB7XG5cdFx0XHRoZWlnaHQgPSB2aWRlby52aWRlb0hlaWdodCAvICh2aWRlby52aWRlb1dpZHRoIC8gd2lkdGgpO1xuXHRcdFx0dmlkZW8uc2V0QXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKTtcblx0XHRcdHZpZGVvLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcblx0XHRcdGNhbnZhcy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGgpO1xuXHRcdFx0Y2FudmFzLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcblx0XHRcdHN0cmVhbWluZyA9IHRydWU7XG5cdFx0fVxuXHR9LCBmYWxzZSk7XG5cblx0c3RhcnRidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZ0KSA9PiB7XG5cdFx0ZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0dGFrZVBpY3R1cmUoKTtcblx0fSwgZmFsc2UpO1xuXG5cdGNsZWFyUGhvdG8oKTtcbn1cblxuZnVuY3Rpb24gY2xlYXJQaG90bygpIHtcblx0Y29uc3QgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXHRjb250ZXh0LmZpbGxTdHlsZSA9ICcjQUFBJztcblx0Y29udGV4dC5maWxsUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuXG5cdGNhbnZhcy5wYXJlbnROb2RlLmNsYXNzTGlzdC5yZW1vdmUoJ2NhbWVyYV9fcHJldmlldycpO1xufVxuXG5mdW5jdGlvbiB0YWtlUGljdHVyZSgpIHtcblx0Y29uc3QgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXHRpZih3aWR0aCAmJiBoZWlnaHQpIHtcblx0XHRjYW52YXMud2lkdGggPSB3aWR0aDtcblx0XHRjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXHRcdGNvbnRleHQuZHJhd0ltYWdlKHZpZGVvLCAwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcblxuXG5cdFx0Y2FudmFzLnBhcmVudE5vZGUuY2xhc3NMaXN0LmFkZCgnY2FtZXJhX19wcmV2aWV3Jyk7XG5cdH0gZWxzZSB7XG5cdFx0Y2xlYXJQaG90bygpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHNhdmVQaG90bygpIHtcblx0Y29uc3QgZGF0YSA9IGNhbnZhcy50b0RhdGFVUkwoJ2ltYWdlL3BuZycpO1xuXG5cdGlmKHBob3RvQ2FsbGJhY2spIHtcblx0XHRwaG90b0NhbGxiYWNrKGRhdGEpO1xuXHR9XG5cblx0Y2FudmFzLnBhcmVudE5vZGUuY2xhc3NMaXN0LnJlbW92ZSgnY2FtZXJhX19wcmV2aWV3Jyk7XG59XG5cbmZ1bmN0aW9uIHJlamVjdFBob3RvKCkge1xuXHRjbGVhclBob3RvKCk7XG5cdGNhbnZhcy5wYXJlbnROb2RlLmNsYXNzTGlzdC5yZW1vdmUoJ2NhbWVyYV9fcHJldmlldycpO1xufVxuXG5cbmV4cG9ydCBkZWZhdWx0IHNldHVwO1xuXG4iLCJcbmNsYXNzIEdhbGxlcnkge1xuXG5cdGNvbnN0cnVjdG9yKHRhcmdldCA9ICcjZ2FsbGVyeScsIG9wdGlvbnMgPSB7fSkge1xuXHRcdC8vIENvbnZlcnQgdGFyZ2V0IHNlbGVjdG9yIHRvIGVsZW1lbnQgaWYgaXQgaXMgYSBzdHJpbmdcblx0XHR0aGlzLnRhcmdldCA9IHR5cGVvZiB0YXJnZXQgPT09ICdzdHJpbmcnXG5cdFx0XHQ/IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0KVxuXHRcdFx0OiB0YXJnZXQ7XG5cblx0XHR0aGlzLm1heENvdW50ID0gb3B0aW9ucy5tYXhDb3VudCB8fCA2O1xuXHRcdHRoaXMucGhvdG9zID0gW107XG5cdH1cblxuXHRhZGRQaG90byhzcmMpIHtcblx0XHR0aGlzLnBob3Rvcy5wdXNoKHNyYyk7XG5cblx0XHRjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xuXHRcdGltYWdlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0XHRzcmMsXG5cdFx0XHRcdHdpZHRoOiBpbWFnZS53aWR0aCxcblx0XHRcdFx0aGVpZ2h0OiBpbWFnZS5oZWlnaHQsXG5cdFx0XHRcdGltYWdlXG5cdFx0XHR9O1xuXHRcdFx0dGhpcy5waG90b3MucHVzaChkYXRhKTtcblx0XHRcdHRoaXMuc2hvd1Bob3RvKGRhdGEpO1xuXHRcdH0pO1xuXHRcdGltYWdlLnNyYyA9IHNyYztcblx0fVxuXG5cdC8qKlxuXHQgKiBEaXNwbGF5IHRoZSBwaG90byBpbiB0aGUgZ2FsbGFyeVxuXHQgKiBAcGFyYW0ge09iamVjdH0gcGhvdG9EYXRhIEF2YWlsYWJsZSBkYXRhIG9uIHRoZSBpbWFnZTtcblx0ICogQHBhcmFtIHtJbWFnZX0gcGhvdG9EYXRhLmltYWdlIFRoZSBpbWFnZSBlbGVtZW50IHRvIGRpc3BsYXlcblx0ICogQHBhcmFtIHtudW1iZXJ9IHBob3RvRGF0YS53aWR0aCBJbWFnZSB3aWR0aCBpbiBwaXhlbHNcblx0ICogQHBhcmFtIHtudW1iZXJ9IHBob3RvRGF0YS5oZWlnaHQgSW1hZ2UgaGVpZ2h0IGluIHBpeGVsc1xuXHQgKiovXG5cdHNob3dQaG90byhwaG90b0RhdGEpIHtcblx0XHRjb25zdCBpbWFnZSA9IHBob3RvRGF0YS5pbWFnZTtcblx0XHRpbWFnZS5jbGFzc05hbWUgPSAnZ2FsbGVyeV9faW1hZ2UnO1xuXHRcdC8vIEluc2VydCBpbiBmaXJzdCBwb3NpdGlvblxuXHRcdGlmKHRoaXMudGFyZ2V0LmNoaWxkcmVuLmxlbmd0aCkge1xuXHRcdFx0dGhpcy50YXJnZXQuaW5zZXJ0QmVmb3JlKGltYWdlLCB0aGlzLnRhcmdldC5maXJzdENoaWxkKTtcblxuXHRcdFx0Ly8gSWYgd2UgaGF2ZSByZWFjaGVkIG1heCBsZW5ndGggcmVtb3ZlIHRoZSBsYXN0IGVsZW1lbnRcblx0XHRcdGlmKHRoaXMudGFyZ2V0LmNoaWxkcmVuLmxlbmd0aCA+IHRoaXMubWF4Q291bnQpIHtcblx0XHRcdFx0Y29uc3QgbGFzdCA9IHRoaXMudGFyZ2V0LmNoaWxkcmVuW3RoaXMudGFyZ2V0LmNoaWxkcmVuLmxlbmd0aCAtIDFdO1xuXHRcdFx0XHR0aGlzLnRhcmdldC5yZW1vdmVDaGlsZChsYXN0KTtcblx0XHRcdFx0XG5cdFx0XHRcdC8vIFJlbW92ZSByZWZlbmNlIHRvIGVsZW1lbnQgbm93IGl0IGlzIHJlbW92ZWRcblx0XHRcdFx0Y29uc3QgbGFzdEluZGV4ID0gdGhpcy5waG90b3MuZmluZEluZGV4KChwaG90bykgPT4gcGhvdG8uaW1hZ2UgPT09IGxhc3QpO1xuXHRcdFx0XHRjb25zb2xlLmxvZygnSW5kZXgnLCBsYXN0SW5kZXgpO1xuXHRcdFx0XHRpZihsYXN0SW5kZXgpIHtcblx0XHRcdFx0XHR0aGlzLnBob3Rvc1tsYXN0SW5kZXhdLmltYWdlID0gbnVsbDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnRhcmdldC5hcHBlbmRDaGlsZChpbWFnZSk7XG5cdFx0fVxuXHRcdHRoaXMuc2NhbGVQaG90b3MocGhvdG9EYXRhKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBTY2FsZSB0aGUgaW1hZ2Ugd2lkdGggdG8gbWF0Y2ggdGhlIGN1cnJlbnQgaGVpZ2h0XG5cdCAqKi9cblx0c2NhbGVQaG90b3MoKSB7XG5cdFx0Y29uc3QgYWN0aXZlSW1hZ2VzID0gdGhpcy5waG90b3MuZmlsdGVyKChwaG90bykgPT4gcGhvdG8uaW1hZ2UpO1xuXHRcdGNvbnN0IHBhcmVudFNpemUgPSB0aGlzLnRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuXHRcdC8vIFJlc2V0IHNpemVzXG5cdFx0YWN0aXZlSW1hZ2VzLmZvckVhY2goKHBob3RvKSA9PiB7XG5cdFx0XHRwaG90by5pbWFnZS53aWR0aCA9IHBob3RvLndpZHRoO1xuXHRcdFx0cGhvdG8uaW1hZ2UuaGVpZ2h0ID0gcGhvdG8uaGVpZ2h0O1xuXG5cdFx0XHRjb25zdCBzY2FsZSA9IHBob3RvLndpZHRoIC8gcGhvdG8uaGVpZ2h0O1xuXHRcdFx0aWYocGhvdG8uaW1hZ2Uud2lkdGggLyBwaG90by5pbWFnZS5oZWlnaHQgIT09IHNjYWxlKSB7XG5cdFx0XHRcdC8vIEZpeCBzY2FsZVxuXHRcdFx0XHRjb25zdCBpbWFnZSA9IHBob3RvLmltYWdlO1xuXHRcdFx0XHRpbWFnZS5oZWlnaHQgPSBwYXJlbnRTaXplLmhlaWdodDtcblx0XHRcdFx0aW1hZ2Uud2lkdGggPSBwYXJlbnRTaXplLmhlaWdodCAqIHNjYWxlO1xuXHRcdFx0fVxuXG5cdFx0fSk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgR2FsbGVyeTtcbiIsImltcG9ydCAnd2hhdHdnLWZldGNoJztcbmltcG9ydCBjYW1lcmEgZnJvbSAnLi9jYW1lcmEnO1xuaW1wb3J0IEdhbGxlcnkgZnJvbSAnLi9nYWxsZXJ5JztcbmltcG9ydCB7Y29ubmVjdCwgc2F2ZVBob3RvLCBnZXRBbGxQaG90b3N9IGZyb20gJy4vc3RvcmFnZSc7XG5cbmNvbnN0IGdhbGxlcnkgPSBuZXcgR2FsbGVyeSgpO1xuXG5jb25uZWN0KClcblx0LnRoZW4oKCkgPT4gZ2V0QWxsUGhvdG9zKCkpXG5cdC50aGVuKChwaG90b3MpID0+IHBob3Rvcy5mb3JFYWNoKChwaG90bykgPT4gZ2FsbGVyeS5hZGRQaG90byhwaG90bykpKVxuXHQuY2F0Y2goKGVycikgPT4gY29uc29sZS5lcnJvcihlcnIpKTtcblxuXG5mdW5jdGlvbiBwaG90b0NhbGxiYWNrKHBob3RvKSB7XG5cdGdhbGxlcnkuYWRkUGhvdG8ocGhvdG8pO1xuXHRzYXZlUGhvdG8ocGhvdG8pO1xufVxuXG5jYW1lcmEoe2NhbGxiYWNrOiBwaG90b0NhbGxiYWNrfSk7XG5cbiIsIlxuY29uc3QgZGJOYW1lID0gJ3Bob3Rvcyc7XG5jb25zdCBkYlZlcnNpb24gPSAxO1xuY29uc3QgcGhvdG9TdG9yZSA9ICdwaG90b3MnO1xuXG5sZXQgY29ubmVjdGVkID0gbnVsbDtcblxuZnVuY3Rpb24gY29ubmVjdCgpIHtcblx0aWYoY29ubmVjdGVkKSB7XG5cdFx0cmV0dXJuIGNvbm5lY3RlZDtcblx0fVxuXG5cdGNvbm5lY3RlZCA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRjb25zdCBjb25uID0gaW5kZXhlZERCLm9wZW4oZGJOYW1lLCBkYlZlcnNpb24pO1xuXG5cdFx0Y29ubi5hZGRFdmVudExpc3RlbmVyKCdzdWNjZXNzJywgKGV2dCkgPT4ge1xuXHRcblx0XHRcdGNvbnN0IGRiID0gZXZ0LnRhcmdldC5yZXN1bHQ7XG5cdFx0XHRyZXNvbHZlKGV2dC50YXJnZXQucmVzdWx0KTtcblx0XHR9KTtcblxuXHRcdGNvbm4uYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCAoZXZ0KSA9PiByZWplY3QoZXZ0LnRhcmdldC5lcnJvcikpO1xuXG5cdFx0Y29ubi5hZGRFdmVudExpc3RlbmVyKCd1cGdyYWRlbmVlZGVkJywgKGV2dCkgPT4ge1xuXHRcdFx0Y29uc3QgZGIgPSBldnQudGFyZ2V0LnJlc3VsdDtcblx0XHRcdGNvbnN0IG9iamVjdFN0b3JlID0gZGIuY3JlYXRlT2JqZWN0U3RvcmUoXG5cdFx0XHRcdHBob3RvU3RvcmUsXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRrZXlQYXRoOiBcImlkXCIsXG5cdFx0XHRcdFx0YXV0b0luY3JlbWVudDogdHJ1ZVxuXHRcdFx0XHR9XG5cdFx0XHQpO1xuXHRcdH0pO1xuXHR9KTtcblx0cmV0dXJuIGNvbm5lY3RlZDtcbn1cblxuZnVuY3Rpb24gZ2V0QWxsUGhvdG9zKCkge1xuXHRyZXR1cm4gY29ubmVjdCgpXG5cdFx0LnRoZW4oKGRiKSA9PiB7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnR2V0IGFsbCBwaG90b3MnKTtcblx0XHRcdFx0Y29uc3QgcGhvdG9zID0gW107XG5cdFx0XHRcdGNvbnN0IHN0b3JlID0gZGIudHJhbnNhY3Rpb24oW3Bob3RvU3RvcmVdKS5vYmplY3RTdG9yZShwaG90b1N0b3JlKTtcblx0XHRcdFx0dmFyIGN1cnNvciA9IHN0b3JlLm9wZW5DdXJzb3IoKTtcblx0XHRcdFx0Y3Vyc29yLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Y2Nlc3MnLCAoZXZ0KSA9PiB7XG5cdFx0XHRcdFx0dmFyIHRoaXNDdXJzb3IgPSBldnQudGFyZ2V0LnJlc3VsdDtcblx0XHRcdFx0XHRpZih0aGlzQ3Vyc29yKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBkYXRhID0gdGhpc0N1cnNvci52YWx1ZTtcblx0XHRcdFx0XHRcdHBob3Rvcy5wdXNoKGRhdGEuc3JjKTtcblx0XHRcdFx0XHRcdHRoaXNDdXJzb3IuY29udGludWUoKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cmVzb2x2ZShwaG90b3MpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Y3Vyc29yLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgKGV2dCkgPT4gcmVqZWN0KGV2dC50YXJnZXQuZXJyb3IpKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xufVxuXG5mdW5jdGlvbiBzYXZlUGhvdG8oc3JjKSB7XG5cdHJldHVybiBjb25uZWN0KClcblx0XHQudGhlbigoZGIpID0+IHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRcdGNvbnN0IHRyYW5zYWN0aW9uID0gZGIudHJhbnNhY3Rpb24oW3Bob3RvU3RvcmVdLCAncmVhZHdyaXRlJyk7XG5cdFx0XHRcdGNvbnN0IG9iamVjdFN0b3JlID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUocGhvdG9TdG9yZSk7XG5cdFx0XHRcdGNvbnN0IHJlcXVlc3QgPSBvYmplY3RTdG9yZS5hZGQoe1xuXHRcdFx0XHRcdHNyY1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCdzdWNjZXNzJywgKGV2dCkgPT4gcmVzb2x2ZShldnQudGFyZ2V0LnJlc3VsdCkpO1xuXHRcdFx0XHRyZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgKGV2dCkgPT4gcmVzb2x2ZShldnQudGFyZ2V0LmVycm9yKSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcbn1cblxuZXhwb3J0IHtcblx0Y29ubmVjdCxcblx0Z2V0QWxsUGhvdG9zLFxuXHRzYXZlUGhvdG9cbn07XG4iXX0=

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js').then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
