const {BrowserWindow} = require('electron');
const window = require('electron-window')
const {assert, expect} = require('chai')

const path = require('path')
const {Dispatcher, getNumRemoteListeners, clearRemoteListeners} = require('..')

describe('Local Dispatching', function() {

    var win = null;

    beforeEach(() => {
        clearRemoteListeners();
    });

  describe('#Main Process', function() {
    it('dispatch event to 1 main process listener', function() {
    	let called = false;
    	let id = Dispatcher.register((payload) => {
    		called = true;
    	});

    	assert(!called);
    	Dispatcher.dispatch('test-event');
    	assert(called);

        Dispatcher.unregister(id);
    });

    it('dispatch event to 3 main process listener', function() {
    	let called = [false, false, false];
    	let id1 = Dispatcher.register((payload) => {
    		if (payload == 'test-event-0') {
    			called[0] = true;
    		}
    	});
    	let id2 = Dispatcher.register((payload) => {
    		if (payload == 'test-event-1') {
    			called[1] = true;
    		}
    	});
    	let id3 = Dispatcher.register((payload) => {
    		if (payload == 'test-event-2') {
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

    it('unregister listener', function() {
    	let called = false;
    	let id_set = Dispatcher.register((payload) => {
    		if (payload == 'test-event-set') {
    			called = true;
    		}
    	});
    	let id_unset = Dispatcher.register((payload) => {
    		if (payload == 'test-event-unset') {
    			called = false;
    		}
    	});

    	assert(!called);
    	Dispatcher.dispatch('test-event-set');
    	assert(called);
    	Dispatcher.dispatch('test-event-unset');
    	assert(!called);

    	Dispatcher.unregister(id_unset);
    	Dispatcher.dispatch('test-event-set');
    	assert(called);
    	Dispatcher.dispatch('test-event-unset');
    	assert(called);

        Dispatcher.unregister(id_set);
    }); 
  });

  describe('#Renderer Process', function() {
    it('dispatch event to 1 renderer process listener', function() {
        return Dispatcher.clear()
        .then(() => {return Dispatcher.getNumListeners()})
        .then(value => {
            expect(value).to.equal(0);
            expect(getNumRemoteListeners()).to.equal(0);
            return new Promise((resolve, reject) => {
                var id = Dispatcher.register((payload) => {
                    if (payload == 'main-to-renderer-event-1-ack') {
                        resolve();
                    } else {
                        reject();
                    }
                });

                win = window.createWindow({ height: 700, width: 1200, 'web-preferences': { 'web-security': false } })

                var indexPath = path.resolve(path.join(__dirname, 'dispatchertron-test-get-num-remote-callbacks/index.html'))
                win._loadURLWithArgs(indexPath, () => {resolve()});
            })
        })
        .then(val => {
            let p = new Promise((resolve, reject) => {
                Dispatcher.register((payload) => {
                    if (payload == 'main-to-renderer-event-1-ack') {
                        resolve();
                    }
                });
            });

            Dispatcher.dispatch('main-to-renderer-event-1')

            return p;
        })
        .then(() => {
            return (new Promise((resolve, reject) => {
                win.on('closed', () => {resolve()});
                win.close();
            }));
        })
        .then(() => {expect(win.isDestroyed()).to.be.true})
        .catch(err => {console.log(err)})        
    });

    it('dispatch from renderer to main', () => {
        return Dispatcher.clear()
        .then(() => {return Dispatcher.getNumListeners()})
        .then(value => {
            expect(value).to.equal(0);
            expect(getNumRemoteListeners()).to.equal(0);
            return new Promise((resolve, reject) => {
                var id = Dispatcher.register((payload) => {
                    if (payload == 'test-renderer-event') {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });

                win = window.createWindow({ height: 700, width: 1200, 'web-preferences': { 'web-security': false } })

                var indexPath = path.resolve(path.join(__dirname, 'dispatchertron-test-app/index.html'))
                win._loadURLWithArgs(indexPath, Function());
            })
        })
        .then(() => {
            return (new Promise((resolve, reject) => {
                win.on('closed', () => {resolve()});
                win.close();
            }));
        })
        .then(() => {expect(win.isDestroyed()).to.be.true})
        .catch(err => {console.log(err)})
    });  

    it('get number of callbacks registered by renderer', () => {
        return Dispatcher.clear()
        .then(() => {return Dispatcher.getNumListeners()})
        .then(value => {
            expect(value).to.equal(0);
            expect(getNumRemoteListeners()).to.equal(0);
            return new Promise((resolve, reject) => {
                win = window.createWindow({ height: 700, width: 1200, 'web-preferences': { 'web-security': false } })

                var indexPath = path.resolve(path.join(__dirname, 'dispatchertron-test-get-num-remote-callbacks/index.html'))
                win._loadURLWithArgs(indexPath, () => {resolve()});
            })
        })
        .then(() => {return Dispatcher.getNumListeners()})
        .then(value => {
            expect(value).to.equal(5);
            return (new Promise((resolve, reject) => {
                win.on('closed', () => {resolve()});
                win.close();
            }));
        })
        .then(() => {expect(win.isDestroyed()).to.be.true})
        .catch(err => {console.log(err)})
    });       
  });  
});  