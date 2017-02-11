# dispatchertron

dispatchertron is a dispatcher for the electron framework.
It can be used in the main and in all renderer processes to register callbacks as listeners and dispatch events to these callbacks.
If an event is dispached by the main or by a renderer process, all registered listeners will be invoked, so you don't have to worry about process borders.

The following example is valid for all process types.

To use dispatchertron in your projects, simply require the Dispatcher from the dispatchertron module.
``` javascript
const {Dispatcher} = require('dispatchertron')
```

If you want to register a new listener callback to the dispachtcher, call the `register` method of the dispatcher object and pass the desired callback as argument. The payload can be defined by your needs and will be passed unchanged from the dispatch call to all registered listeners.
``` javascript
const id = Dispatcher.register(payload => {
  if (payload.event === 'some-event') {
    console.log('Data = ', payload.data);
  });
```
The return value is the new id of the registered listeners and can be used if you want to unregister the listener again.

If you want to dispatch a new event to all registered listeners, call the `dispatch` method of the dispatcher and all registered callbacks will be called with the passed payload as argument.
If there are only registered listeners of the same process, the dispatch call will return immediately with a `Promise.resolve()`. However if there are registered listeners in other processes (e.g. renderers), the dispatch call will return a unresolved Promise that will resolve once all listeners of all processes have been called successfully.
``` javascript
Dispatcher.dispatch({
  event: 'some-event',
  data: 3
}).then(() => {
  console.log('All listeners have been invoked!');
});
```

If you don't need a registered listener anymore, you can use the `unregister` method and pass the id which is returned from the `register` methods as argument. This will delete the listener with the given id from the dispatcher.
``` javascript
Dispatcher.unregister(id);
```

If you want to know how many listeners are registered in all processes, call the `getNumListeners` method. Like the `dispatch` method, this will return a Promise that will resolve with the number of registered listeners by all processes.
``` javascript
Dispatcher.getNumListeners().then(num => {
  consoled.log('There are', + num, 'registered listeners in all processes');
});
```

You can also ask the dispatcher for the number of registered callbacks in the current process by calling the `getNumLocalListeners` method, which will return a value instead of a Promise because there is no async function call.
``` javascript
console.log('There are', Dispatcher.getNumLocalListeners(), 'local listeners');
```

If you want to reset the Dispatcher and delete all registered listeners, just call the `clear` method of the dispatcher.
``` javascript
Dispatcher.clear();
```
The method `getNumListeners` will resolve with 0 after clearing the dispatcher.
