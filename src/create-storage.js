/**
 * @module  gl-waveform/src/worker-storage
 *
 * Storage using worker using storage, alternative to ./storage.js
 */
'use strict';

const Storage = require('./storage');

let isWorkerAvailable = window.Worker;

let workify;
if (isWorkerAvailable) {
	workify = require('webworkify-webpack');
}

module.exports = createStorage;


//webworker version of storage
function createStorage (opts) {
	//single-thread storage
	if (!isWorkerAvailable || (opts && opts.worker === false))  return Storage();

	//worker storage
	let worker = workify(require('./worker'));

	//list of planned callbacks
	let cbs = {
		push: [],
		get: [],
		set: [],
		update: []
	};

	worker.addEventListener('message', function (e) {
		let action = e.data.action;
		let data = e.data.data;
		let err = e.data.error;
		if (!cbs[action]) throw Error('Unknown action ' + action);
		if (err) throw err;
		let cb = cbs[action].shift();
		cb && cb(null, data);
	});

	//init storage
	worker.postMessage({action: 'init', args: [opts]});

	//webworker wrapper for storage
	return {
		push: (data, cb) => {
			cbs.push.push(cb);
			worker.postMessage({action: 'push', args: [data] });
		},
		set: (data, cb) => {
			cbs.set.push(cb);
			worker.postMessage({action: 'set', args: [data] });
		},
		get: (opts, cb) => {
			cbs.get.push(cb);
			worker.postMessage({action: 'get', args: [opts] });
		},
		update: (opts, cb) => {
			cbs.update.push(cb);
			worker.postMessage({action: 'update', args: [opts]})
		}
	};
}
