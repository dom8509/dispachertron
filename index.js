
const path = require('path');
const electron = require('electron');
const isRenderer = require('is-electron-renderer');

// ==============================================================

class Dispatcher {
  constructor() {
    this._prefix = 'ID_';
    this._lastID = 0;
    this._callbacks = [];

    this._dispatchingRunning = false;
  }

  register(callback)  {
    let id = this._prefix + this._lastID++;
    this._callbacks[id] = callback;

    return id;
  }

  unregister(id) {
    delete this._callbacks[id];
  }

  // Todo:
  dispatch(payload) {
    this._dispatchingRunning = true;

    for (let id in this._callbacks) {
      this._callbacks[id](payload);
    }

    return (ipc_send_event(payload).then(() => {
      return (new Promise(() => {
        this._dispatchingRunning = false;
      }));
    }));
  }

  _local_dispatch(payload) {
    for (let id in this._callbacks) {
      this._callbacks[id](payload);
    }
  }

  getNumListeners() {
  	return (ipc_send_get_num_listeners().then(values => {
  		return (new Promise(resolve => {
  			resolve(values.reduce((a, b) => a + b));
  		}));
  	}));
  }

  getNumLocalListeners() {
    return Object.keys(this._callbacks).length;
  }

  clear() {
    for (let id in this._callbacks) {
      delete this._callbacks[id];
    }

    return ipc_send_clear();
  }

  _local_clear() {
    for (let id in this._callbacks) {
      delete this._callbacks[id];
    }
  }
}

const dispatcher = new Dispatcher();

// ==============================================================

const DISPATCH_EVENT = 'dispatchertron-dispatch-event';
const CLEAR_EVENT = 'dispatchertron-clear-event';
const GET_NUM_LISTENERS_EVENT = 'dispatchertron-getnumlisteners-event';

const EVENT_SUFFIX_SUCCESS = '-success';
const EVENT_SUFFIX_FAILURE = '-failure';

// ==============================================================

// in main process
var _remoteRenderers = [];
var _remoteRendererId = 0;

var addRemoteRenderer = function(window) {
  var id = 'ID_' + _remoteRendererId++;
  _remoteRenderers[id] = window.webContents;

  window.on('close', () => {
    delete _remoteRenderers[id];
  })
}

var getNumRemoteRenderers = function() {
  return Object.keys(_remoteRenderers).length;
}

// ==============================================================

var ipc = null;

var ipc_send_event = null;
var ipc_send_clear = null;
var ipc_send_get_num_listeners = null;

var ipc_send_event_status = null;
var ipc_send_clear_status = null;
var ipc_send_get_num_listeners_status = null;

if (isRenderer) {
  ipc = electron.ipcRenderer;

  // register this renderer to the main thread
  const remote = electron.remote;
  remote.require(path.join(__dirname)).addRemoteRenderer(remote.getCurrentWindow());

  _remoteRenderers['ID_0'] = ipc;
} else {
  ipc = electron.ipcMain;
}

// ==============================================================

function ipc_send(event, statusArray, payload) {
  let ipc_send_promisses = [Promise.resolve(0)];

  if (Object.keys(_remoteRenderers).length > 0) {
  	ipc_send_promisses = Object.keys(_remoteRenderers).map((id, idx) => {
	    return new Promise((resolve, reject) => {
	      statusArray[idx] = {
	        resolve: resolve,
	        reject: reject
	      }

        _remoteRenderers[id].send(event, {idx: idx, data: payload});
	    })
	  });
  }

  return Promise.all(ipc_send_promisses);
}

var ipc_send_event = function(payload) {
  ipc_send_event_status = Array(_remoteRenderers.length);
  return ipc_send(DISPATCH_EVENT, ipc_send_event_status, payload);
}

var ipc_send_clear = function() {
  ipc_send_clear_status = Array(_remoteRenderers.length);
  return ipc_send(CLEAR_EVENT, ipc_send_clear_status, '');
} 

var ipc_send_get_num_listeners = function() {
  ipc_send_get_num_listeners_status = Array(_remoteRenderers.length);
  return ipc_send(GET_NUM_LISTENERS_EVENT, ipc_send_get_num_listeners_status, '');
}

// ==============================================================

// on event

ipc.on(DISPATCH_EVENT, (event, args) => {
  dispatcher._local_dispatch(args.data);
  event.sender.send(DISPATCH_EVENT + EVENT_SUFFIX_SUCCESS, {idx: args.idx});
});

ipc.on(CLEAR_EVENT, (event, args) => {
  dispatcher._local_clear();
  event.sender.send(CLEAR_EVENT + EVENT_SUFFIX_SUCCESS, {idx: args.idx});
});  

ipc.on(GET_NUM_LISTENERS_EVENT, (event, args) => {
  let numLocalListeners = dispatcher.getNumLocalListeners();
  event.sender.send(GET_NUM_LISTENERS_EVENT + EVENT_SUFFIX_SUCCESS, {idx: args.idx, data: numLocalListeners});
});  

// on event success

ipc.on(DISPATCH_EVENT + EVENT_SUFFIX_SUCCESS, (event, args) => {
  ipc_send_event_status[args.idx].resolve();
});

ipc.on(CLEAR_EVENT + EVENT_SUFFIX_SUCCESS, (event, args) => {
  ipc_send_clear_status[args.idx].resolve();
}); 

ipc.on(GET_NUM_LISTENERS_EVENT + EVENT_SUFFIX_SUCCESS, (event, args) => {
  ipc_send_get_num_listeners_status[args.idx].resolve(args.data);
}); 

// ==============================================================

module.exports = {
  Dispatcher: dispatcher,
  addRemoteRenderer: addRemoteRenderer,
  getNumRemoteRenderers: getNumRemoteRenderers
}