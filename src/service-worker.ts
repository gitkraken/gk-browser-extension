/// <reference lib="webworker" />

try {
	importScripts('background.js');
} catch (e) {
	debugger;
	console.error(e);
}
