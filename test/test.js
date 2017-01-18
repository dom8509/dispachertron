const {BrowserWindow} = require('electron');
const window = require('electron-window')
const assert = require('assert')
const path = require('path')
const {Dispatcher} = require('..')

Promise.prototype.finally = function (callback) {
        let p = this.constructor;
        // We don’t invoke the callback in here,
        // because we want then() to handle its exceptions
        return this.then(
            // Callback fulfills: pass on predecessor settlement
            // Callback rejects: pass on rejection (=omit 2nd arg.)
            value  => p.resolve(callback()).then(() => value),
            reason => p.resolve(callback()).then(() => { throw reason })
        );
    };

describe('Local Dispatching', function() {

    // beforeEach(() => {
    //     console.log('local listeners:', Dispatcher.getNumLocalListeners())
    //     Dispatcher.getNumListeners()
    //         .then((value) => {
    //                 console.log('num listeners:', value);
    //                 assert(value == 0);
    //             })
    //         .catch(err => console.log('failed', err));
    // });

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

  describe('#Inter Process', function() {
    it('dispatch from renderer to main', function() {
        return new Promise((resolve, reject) => {
            var id = Dispatcher.register((payload) => {
                if (payload == 'test-renderer-event') {
                    resolve();
                } else {
                    reject();
                }
            });

            var win = window.createWindow({ height: 700, width: 1200, 'web-preferences': { 'web-security': false } })

            var indexPath = path.resolve(path.join(__dirname, 'dispatchertron-test-app/index.html'))
            win._loadURLWithArgs(indexPath, Function());
        })
        .then(val => {assert(true)})
        .catch(err => {console.log(err); assert(false)})
    });  

    var win2 = null;

    it('get number of callbacks registered by renderer', function() {
        return new Promise((resolve, reject) => {
            win2 = window.createWindow({ height: 700, width: 1200, 'web-preferences': { 'web-security': false } })

            var indexPath = path.resolve(path.join(__dirname, 'dispatchertron-test-get-num-remote-callbacks/index.html'))
            win2._loadURLWithArgs(indexPath, Function());

            win2.webContents.on('dom-ready', () => {
                resolve();
            })
        })
        .then(() => {return Dispatcher.getNumListeners()})
        .then(value => {assert(value == 5)})
        .catch(err => {console.log(err); assert(false)})
    });  
  });  
});  