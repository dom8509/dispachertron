const window = require('electron-window');
const {assert, expect} = require('chai');

const path = require('path');
const {Dispatcher, getNumRemoteRenderers} = require('..');

let win = null;
let win1 = null;
let win2 = null;

/* eslint-disable no-unused-expressions */

describe('Test Registration', () => {
  it('register/unregister listener', () => {
    let called = false;
    const idSet = Dispatcher.register(payload => {
      if (payload === 'test-event-set') {
        called = true;
      }
    });
    const idUnset = Dispatcher.register(payload => {
      if (payload === 'test-event-unset') {
        called = false;
      }
    });

    assert(!called);
    Dispatcher.dispatch('test-event-set');
    assert(called);
    Dispatcher.dispatch('test-event-unset');
    assert(!called);

    Dispatcher.unregister(idUnset);
    Dispatcher.dispatch('test-event-set');
    assert(called);
    Dispatcher.dispatch('test-event-unset');
    assert(called);

    Dispatcher.unregister(idSet);
  });

  it('test registration of remote renderers', () => {
    return Dispatcher.clear()
            .then(() => {
              return Dispatcher.getNumListeners();
            })
            .then(value => {
              expect(value).to.equal(0);
              expect(getNumRemoteRenderers()).to.equal(0);
              return Promise.all([
                new Promise(resolve => {
                  win = window.createWindow({height: 700, width: 1200, 'web-preferences': {'web-security': false}});

                  const indexPath = path.resolve(path.join(__dirname, 'dispatchertron-test-get-num-remote-callbacks/index.html'));
                  win._loadURLWithArgs(indexPath, () => {
                    resolve();
                  });
                }),
                new Promise(resolve => {
                  win1 = window.createWindow({height: 700, width: 1200, 'web-preferences': {'web-security': false}});

                  const indexPath = path.resolve(path.join(__dirname, 'dispatchertron-test-get-num-remote-callbacks/index.html'));
                  win1._loadURLWithArgs(indexPath, () => {
                    resolve();
                  });
                }),
                new Promise(resolve => {
                  win2 = window.createWindow({height: 700, width: 1200, 'web-preferences': {'web-security': false}});

                  const indexPath = path.resolve(path.join(__dirname, 'dispatchertron-test-get-num-remote-callbacks/index.html'));
                  win2._loadURLWithArgs(indexPath, () => {
                    resolve();
                  });
                })
              ]);
            })
            .then(() => {
              return new Promise(resolve => {
                resolve(getNumRemoteRenderers());
              });
            })
            .then(value => {
              expect(value).to.equal(3);
              expect(win.isDestroyed()).to.be.false;
              expect(win1.isDestroyed()).to.be.false;
              expect(win2.isDestroyed()).to.be.false;
              return (new Promise(resolve => {
                win.on('closed', () => {
                  resolve(getNumRemoteRenderers());
                });
                win.close();
              }));
            })
            .then(value => {
              expect(value).to.equal(2);
              expect(win.isDestroyed()).to.be.true;
              expect(win1.isDestroyed()).to.be.false;
              expect(win2.isDestroyed()).to.be.false;

              return (new Promise(resolve => {
                win1.on('closed', () => {
                  resolve(getNumRemoteRenderers());
                });
                win1.close();
              }));
            })
            .then(value => {
              expect(value).to.equal(1);
              expect(win.isDestroyed()).to.be.true;
              expect(win1.isDestroyed()).to.be.true;
              expect(win2.isDestroyed()).to.be.false;

              return (new Promise(resolve => {
                win2.on('closed', () => {
                  resolve(getNumRemoteRenderers());
                });
                win2.close();
              }));
            })
            .then(value => {
              expect(value).to.equal(0);
              expect(win.isDestroyed()).to.be.true;
              expect(win1.isDestroyed()).to.be.true;
              expect(win2.isDestroyed()).to.be.true;
            });
  });

  it('get number of callbacks registered by renderer', () => {
    return Dispatcher.clear()
            .then(() => {
              return Dispatcher.getNumListeners();
            })
            .then(value => {
              expect(value).to.equal(0);
              expect(getNumRemoteRenderers()).to.equal(0);
              return new Promise(resolve => {
                win = window.createWindow({height: 700, width: 1200, 'web-preferences': {'web-security': false}});

                const indexPath = path.resolve(path.join(__dirname, 'dispatchertron-test-get-num-remote-callbacks/index.html'));
                win._loadURLWithArgs(indexPath, () => {
                  resolve();
                });
              });
            })
            .then(() => {
              return Dispatcher.getNumListeners();
            })
            .then(value => {
              expect(value).to.equal(5);
              return (new Promise(resolve => {
                win.on('closed', () => {
                  resolve();
                });
                win.close();
              }));
            })
            .then(() => {
              expect(win.isDestroyed()).to.be.true;
            });
  });

  it('get number of callbacks registered by renderer and main', () => {
    return Dispatcher.clear()
            .then(() => {
              return Dispatcher.getNumListeners();
            })
            .then(value => {
              expect(value).to.equal(0);
              expect(getNumRemoteRenderers()).to.equal(0);
              return new Promise(resolve => {
                win = window.createWindow({height: 700, width: 1200, 'web-preferences': {'web-security': false}});

                const indexPath = path.resolve(path.join(__dirname, 'dispatchertron-test-get-num-remote-callbacks/index.html'));
                win._loadURLWithArgs(indexPath, () => {
                  resolve();
                });
              });
            })
            .then(() => {
              Dispatcher.register(() => {});
              Dispatcher.register(() => {});
              return Dispatcher.getNumListeners();
            })
            .then(value => {
              expect(value).to.equal(7);
              return (new Promise(resolve => {
                win.on('closed', () => {
                  resolve();
                });
                win.close();
              }));
            })
            .then(() => {
              expect(win.isDestroyed()).to.be.true;
            });
  });
});

describe('Test Dispatching', () => {
  it('dispatch event to 1 main process listener', () => {
    let called = false;
    const id = Dispatcher.register(() => {
      called = true;
    });

    assert(!called);
    Dispatcher.dispatch('test-event');
    assert(called);

    Dispatcher.unregister(id);
  });

  it('dispatch event to 3 main process listener', () => {
    const called = [false, false, false];
    const id1 = Dispatcher.register(payload => {
      if (payload === 'test-event-0') {
        called[0] = true;
      }
    });
    const id2 = Dispatcher.register(payload => {
      if (payload === 'test-event-1') {
        called[1] = true;
      }
    });
    const id3 = Dispatcher.register(payload => {
      if (payload === 'test-event-2') {
        called[2] = true;
      }
    });

    Dispatcher.dispatch('test-event');
    assert(!called[0]);
    assert(!called[1]);
    assert(!called[2]);

    Dispatcher.dispatch('test-event-1');
    assert(!called[0]);
    assert(called[1]);
    assert(!called[2]);

    Dispatcher.dispatch('test-event-0');
    assert(called[0]);
    assert(called[1]);
    assert(!called[2]);

    Dispatcher.dispatch('test-event-2');
    assert(called[0]);
    assert(called[1]);
    assert(called[2]);

    Dispatcher.unregister(id1);
    Dispatcher.unregister(id2);
    Dispatcher.unregister(id3);
  });

  it('dispatch event from main to renderer', () => {
    return Dispatcher.clear()
            .then(() => {
              return Dispatcher.getNumListeners();
            })
            .then(value => {
              expect(value).to.equal(0);
              expect(getNumRemoteRenderers()).to.equal(0);
              return new Promise(resolve => {
                win = window.createWindow({height: 700, width: 1200, 'web-preferences': {'web-security': false}});

                const indexPath = path.resolve(path.join(__dirname, 'dispatchertron-test-get-num-remote-callbacks/index.html'));
                win._loadURLWithArgs(indexPath, () => {
                  resolve();
                });
              });
            })
            .then(() => {
              const p = new Promise(resolve => {
                Dispatcher.register(payload => {
                  if (payload === 'main-to-renderer-event-1-ack') {
                    resolve();
                  }
                });
              });

              Dispatcher.dispatch('main-to-renderer-event-1');

              return p;
            })
            .then(() => {
              return (new Promise(resolve => {
                win.on('closed', () => {
                  resolve();
                });
                win.close();
              }));
            })
            .then(() => {
              expect(win.isDestroyed()).to.be.true;
            });
  });

  it('dispatch event from renderer to main', () => {
    return Dispatcher.clear()
            .then(() => {
              return Dispatcher.getNumListeners();
            })
            .then(value => {
              expect(value).to.equal(0);
              expect(getNumRemoteRenderers()).to.equal(0);
              return new Promise(resolve => {
                Dispatcher.register(payload => {
                  if (payload === 'test-renderer-event') {
                    resolve(true);
                  } else {
                    resolve(false);
                  }
                });

                win = window.createWindow({height: 700, width: 1200, 'web-preferences': {'web-security': false}});

                const indexPath = path.resolve(path.join(__dirname, 'dispatchertron-test-app/index.html'));
                win._loadURLWithArgs(indexPath, () => {});
              });
            })
            .then(() => {
              return (new Promise(resolve => {
                win.on('closed', () => {
                  resolve();
                });
                win.close();
              }));
            })
            .then(() => {
              expect(win.isDestroyed()).to.be.true;
            });
  });
});
