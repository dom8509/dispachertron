const path = require('path');
const electron = require('electron');
const isRenderer = require('is-electron-renderer');

// ==============================================================

const DISPATCH_EVENT = 'dispatchertron-dispatch-event';
const CLEAR_EVENT = 'dispatchertron-clear-event';
const GET_NUM_LISTENERS_EVENT = 'dispatchertron-getnumlisteners-event';

const EVENT_SUFFIX_SUCCESS = '-success';
// const EVENT_SUFFIX_FAILURE = '-failure';

// ==============================================================

// in main process
const _remoteRenderers = [];
let _remoteRendererId = 0;

const addRemoteRenderer = function (window) {
  const id = 'ID_' + _remoteRendererId++;
  _remoteRenderers[id] = window.webContents;

  window.on('close', () => {
    delete _remoteRenderers[id];
  });
};

const getNumRemoteRenderers = function () {
  return Object.keys(_remoteRenderers).length;
};

// ==============================================================

let ipc = null;

let ipcSendEventStatus = null;
let ipcSendClearStatus = null;
let ipcSendGetNumListenersStatus = null;

if (isRenderer) {
  ipc = electron.ipcRenderer;

  // register this renderer to the main thread
  const remote = electron.remote;
  remote.require(path.join(__dirname)).addRemoteRenderer(remote.getCurrentWindow());

  _remoteRenderers.ID_0 = ipc;
} else {
  ipc = electron.ipcMain;
}

// ==============================================================

function ipcSend(event, statusArray, payload) {
  let ipcSendPromisses = [Promise.resolve(0)];

  if (getNumRemoteRenderers() > 0) {
    ipcSendPromisses = Object.keys(_remoteRenderers).map((id, idx) => {
      return new Promise((resolve, reject) => {
        statusArray[idx] = {
          resolve,
          reject
        };

        _remoteRenderers[id].send(event, {
          idx,
          data: payload
        });
      });
    });
  }

  return Promise.all(ipcSendPromisses);
}

const ipcSendEvent = function (payload) {
  ipcSendEventStatus = Array(_remoteRenderers.length);
  return ipcSend(DISPATCH_EVENT, ipcSendEventStatus, payload);
};

const ipcSendClear = function () {
  ipcSendClearStatus = Array(_remoteRenderers.length);
  return ipcSend(CLEAR_EVENT, ipcSendClearStatus, '');
};

const ipcSendGetNumListeners = function () {
  ipcSendGetNumListenersStatus = Array(_remoteRenderers.length);
  return ipcSend(GET_NUM_LISTENERS_EVENT, ipcSendGetNumListenersStatus, '');
};

// ==============================================================

class Dispatcher {
  constructor() {
    this._prefix = 'ID_';
    this._lastID = 0;
    this._callbacks = [];

    this._dispatchingRunning = false;
  }

  register(callback) {
    const id = this._prefix + this._lastID++;
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

      this._localDispatch(payload);

      if (getNumRemoteRenderers() > 0) {
        result = (ipcSendEvent(payload).then(() => {
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
    return (ipcSendGetNumListeners().then(values => {
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

      this._localClear();

      if (getNumRemoteRenderers() > 0) {
        result = (ipcSendClear().then(() => {
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

  // private functions
  _localDispatch(payload) {
    for (const id in this._callbacks) {
      if (Object.prototype.hasOwnProperty.call(this._callbacks, id)) {
        this._callbacks[id](payload);
      }
    }
  }

  _localClear() {
    for (const id in this._callbacks) {
      if (Object.prototype.hasOwnProperty.call(this._callbacks, id)) {
        delete this._callbacks[id];
      }
    }
  }
}

const dispatcher = new Dispatcher();

// ==============================================================

// on event

ipc.on(DISPATCH_EVENT, (event, args) => {
  event.sender.send(DISPATCH_EVENT + EVENT_SUFFIX_SUCCESS, {
    idx: args.idx
  });
  dispatcher._localDispatch(args.data);
});

ipc.on(CLEAR_EVENT, (event, args) => {
  event.sender.send(CLEAR_EVENT + EVENT_SUFFIX_SUCCESS, {
    idx: args.idx
  });
  dispatcher._localClear();
});

ipc.on(GET_NUM_LISTENERS_EVENT, (event, args) => {
  const numLocalListeners = dispatcher.getNumLocalListeners();
  event.sender.send(GET_NUM_LISTENERS_EVENT + EVENT_SUFFIX_SUCCESS, {
    idx: args.idx,
    data: numLocalListeners
  });
});

// on event success

ipc.on(DISPATCH_EVENT + EVENT_SUFFIX_SUCCESS, (event, args) => {
  ipcSendEventStatus[args.idx].resolve();
});

ipc.on(CLEAR_EVENT + EVENT_SUFFIX_SUCCESS, (event, args) => {
  ipcSendClearStatus[args.idx].resolve();
});

ipc.on(GET_NUM_LISTENERS_EVENT + EVENT_SUFFIX_SUCCESS, (event, args) => {
  ipcSendGetNumListenersStatus[args.idx].resolve(args.data);
});

// ==============================================================

module.exports = {
  Dispatcher: dispatcher,
  addRemoteRenderer,
  getNumRemoteRenderers
};
