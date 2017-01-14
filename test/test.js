const assert = require('assert')
const {Dispatcher} = require('..')

describe('Local Dispatching', function() {
  describe('#Main Process', function() {
    it('dispatch event to 1 main process listener', function() {
    	let called = false;
    	Dispatcher.register((payload) => {
    		called = true;
    	});

    	assert(!called);
    	Dispatcher.dispatch('test-event');
    	assert(called);
    });

    it('dispatch event to 3 main process listener', function() {
    	let called = [false, false, false];
    	Dispatcher.register((payload) => {
    		if (payload == 'test-event-0') {
    			called[0] = true;
    		}
    	});
    	Dispatcher.register((payload) => {
    		if (payload == 'test-event-1') {
    			called[1] = true;
    		}
    	});
    	Dispatcher.register((payload) => {
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
    }); 
  });
});  