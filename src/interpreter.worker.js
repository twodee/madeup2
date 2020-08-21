import {
  interpret
} from './interpreter.js';

self.addEventListener('message', event => {
  switch (event.data.command) {
    case 'interpret':
      const result = interpret(
        event.data.source,
        message => self.postMessage({type: 'output', payload: message}),
        message => self.postMessage({type: 'output-delayed', payload: message}),
        callRecord => self.postMessage({type: 'show-docs', payload: callRecord}),
        event.data.renderMode
      );
      if (result) {
        self.postMessage({type: 'environment', payload: result.toPod()});
      } else {
        self.postMessage({type: 'error'});
      }
      break;
    default:
      console.error(`I don't know command ${event.data.command}.`);
  }
}, false);
