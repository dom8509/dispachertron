const electron = require('electron');
const isRenderer = require('is-electron-renderer');

// ==============================================================

class Dispatcher {
  constructor() {
    this._prefix = 'ID_';
    this._lastID = 0;
    this._callbacks = {};
  }

  register(callback)  {
    let id = this._prefix + this._lastID++;
    this._callbacks[id] = callback;

    return id;
  }

  unregister(id) {
    delete this._callbacks[id];
  }

  dispatch(payload) {
    for (let id in this._callbacks) {
      this._callbacks[id](payload);
    }

    ipc_send(payload);
  }

  local_dispatch(payload) {
    for (let id in this._callbacks) {
      this._callbacks[id](payload);
    }
  }
}

const dispatcher = new Dispatcher();

// ==============================================================

// in main process
var _listeningRenderers = [];

module.exports.addRemoteListener = function(webcontents) {
  _listeningRenderers.push(webcontents);
}

// ==============================================================

var ipc_send = null;

if (isRenderer) {
  // The renderer thread must listen for main thread events
  electron.ipcRenderer.on('fluxtron-dispatch-event', (event, args) => {
    dispatcher.local_dispatch(args);
  });

  // register this renderer to the main thread
  const remote = electron.remote;
  remote.require('./src/index').addRemoteListener(remote.getCurrentWebContents());

  ipc_send = (payload) => {
    electron.ipcRenderer.send('fluxtron-dispatch-event', payload);
  };
} else {
  // The main thread must listen for renderer events
  electron.ipcMain.on('fluxtron-dispatch-event', (event, args) => {
    dispatcher.local_dispatch(args);
  });
  
  ipc_send = (payload) => {
    _listeningRenderers.forEach((elem) => {
      elem.send('fluxtron-dispatch-event', payload);
    });
  };
}

module.exports.Dispatcher = dispatcher;