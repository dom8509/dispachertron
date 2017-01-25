
const path = require('path');
const electron = require('electron');
const isRenderer = require('is-electron-renderer');

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

var addRemoteRenderer = function (window) {
  var id = 'ID_' + _remoteRendererId++;
  _remoteRenderers[id] = window.webContents;

  window.on('close', () => {
    delete _remoteRenderers[id];
  })
}

var getNumRemoteRenderers = function () {
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

class Dispatcher {
  constructor() {
    this._prefix = 'ID_';
    this._lastID = 0;
    this._callbacks = [];

    this._dispatchingRunning = false;
  }

  register(callback) {
    let id = this._prefix + this._lastID++;
    this._callbacks[id] = callback;

    return id;
  }

  unregister(id) {
    delete this._callbacks[id];
  }

  dispatch(payload) {
    let result = Promise.resolve();

    if (!this._dispatchingRunning) {
      this._dispatchingRunning = true;

      for (let id in this._callbacks) {
        this._callbacks[id](payload);
      }

      if (getNumRemoteRenderers() > 0) {
        result = (ipc_send_event(payload).then(() => {
          return (new Promise(resolve => {
            this._dispatchingRunning = false;
            resolve();
          }));
        }));
      } else {
        this._dispatchingRunning = false;
      }
    }

    return result;
  }

  getNumListeners() {
    return (ipc_send_get_num_listeners().then(values => {
      return (new Promise(resolve => {
        resolve(values.reduce((a, b) => a + b) + this.getNumLocalListeners());
      }));
    }));
  }

  getNumLocalListeners() {
    return Object.keys(this._callbacks).length;
  }

  clear() {
    let result = Promise.resolve();

    if (!this._dispatchingRunning) {
      this._dispatchingRunning = true;

      for (let id in this._callbacks) {
        delete this._callbacks[id];
      }

      if (getNumRemoteRenderers() > 0) {
        result = (ipc_send_clear().then(() => {
          return (new Promise(resolve => {
            this._dispatchingRunning = false;
            resolve();
          }));
        }));
      } else {
        this._dispatchingRunning = false;
      }
    }

    return result;
  }

  forceClear() {
    let result = Promise.resolve();

    for (let id in this._callbacks) {
      delete this._callbacks[id];
    }

    if (getNumRemoteRenderers() > 0) {
      result = (ipc_send_clear().then(() => {
        return (new Promise(resolve => {
          resolve();
        }));
      }));
    }

    return result;
  }

  // private functions
  _localDispatch(payload) {
    for (let id in this._callbacks) {
      this._callbacks[id](payload);
    }
  }

  _localClear() {
    for (let id in this._callbacks) {
      delete this._callbacks[id];
    }
  }
}

const dispatcher = new Dispatcher();

// ==============================================================

function ipc_send(event, statusArray, payload) {
  let ipc_send_promisses = [Promise.resolve(0)];

  if (getNumRemoteRenderers() > 0) {
    ipc_send_promisses = Object.keys(_remoteRenderers).map((id, idx) => {
      return new Promise((resolve, reject) => {
        statusArray[idx] = {
          resolve: resolve,
          reject: reject
        }

        _remoteRenderers[id].send(event, { idx: idx, data: payload });
      })
    });
  }

  return Promise.all(ipc_send_promisses);
}

var ipc_send_event = function (payload) {
  ipc_send_event_status = Array(_remoteRenderers.length);
  return ipc_send(DISPATCH_EVENT, ipc_send_event_status, payload);
}

var ipc_send_clear = function () {
  ipc_send_clear_status = Array(_remoteRenderers.length);
  return ipc_send(CLEAR_EVENT, ipc_send_clear_status, '');
}

var ipc_send_get_num_listeners = function () {
  ipc_send_get_num_listeners_status = Array(_remoteRenderers.length);
  return ipc_send(GET_NUM_LISTENERS_EVENT, ipc_send_get_num_listeners_status, '');
}

// ==============================================================

// on event

ipc.on(DISPATCH_EVENT, (event, args) => {
  event.sender.send(DISPATCH_EVENT + EVENT_SUFFIX_SUCCESS, { idx: args.idx });
  dispatcher._localDispatch(args.data);
});

ipc.on(CLEAR_EVENT, (event, args) => {
  event.sender.send(CLEAR_EVENT + EVENT_SUFFIX_SUCCESS, { idx: args.idx });
  dispatcher._localClear();
});

ipc.on(GET_NUM_LISTENERS_EVENT, (event, args) => {
  let numLocalListeners = dispatcher.getNumLocalListeners();
  event.sender.send(GET_NUM_LISTENERS_EVENT + EVENT_SUFFIX_SUCCESS, { idx: args.idx, data: numLocalListeners });
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

dispatcher.register

// ==============================================================

module.exports = {
  Dispatcher: dispatcher,
  addRemoteRenderer: addRemoteRenderer,
  getNumRemoteRenderers: getNumRemoteRenderers
}