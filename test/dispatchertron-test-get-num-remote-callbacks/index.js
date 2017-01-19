const {Dispatcher} = require(__dirname + '/../..');

Dispatcher.register(payload => {
	if (payload == 'main-to-renderer-event-1') {
		Dispatcher.dispatch('main-to-renderer-event-1-ack');
	}
});

Dispatcher.register(payload => {
	if (payload == 'main-to-renderer-event-2') {
		Dispatcher.dispatch('main-to-renderer-event-2-ack');
	}
});

Dispatcher.register(payload => {
	if (payload == 'main-to-renderer-event-3') {
		Dispatcher.dispatch('main-to-renderer-event-3-ack');
	}
});

Dispatcher.register(payload => {
	if (payload == 'main-to-renderer-event-4') {
		Dispatcher.dispatch('main-to-renderer-event-4-ack');
	}
});

Dispatcher.register(payload => {
	if (payload == 'main-to-renderer-event-5') {
		Dispatcher.dispatch('main-to-renderer-event-6-ack');
	}
});
