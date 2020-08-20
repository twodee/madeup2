let messagerElement;
let messagerDocument;
let highlight;
let pendingLog;

export class Messager {
  constructor(element, doc, onHighlight) {
    messagerElement = element;
    messagerDocument = doc;
    highlight = onHighlight;
    pendingLog = null;
  }

  static log(text, callObject) {
    Messager.clearPending();

    let matches = text.match(/^(-?\d+):(-?\d+):(-?\d+):(-?\d+):(.*)/s);
    if (matches) {
      let lineStart = parseInt(matches[1]);
      let lineEnd = parseInt(matches[2]);
      let columnStart = parseInt(matches[3]);
      let columnEnd = parseInt(matches[4]);
      let message = matches[5];

      let linkNode = messagerDocument.createElement('a');
      linkNode.setAttribute('href', '#');
      linkNode.addEventListener('click', () => highlight(lineStart, lineEnd, columnStart, columnEnd));

      let label = messagerDocument.createTextNode('Line ' + (parseInt(lineEnd) + 1));
      linkNode.appendChild(label);

      messagerElement.appendChild(linkNode);

      // let textNode = messagerDocument.createTextNode(': ' + message);
      // messagerElement.appendChild(textNode);

      let rest = messagerDocument.createElement('span');
      rest.innerHTML = ': ' + message;
      messagerElement.appendChild(rest);
    } else {
      let textNode = messagerDocument.createTextNode(text);
      messagerElement.appendChild(textNode);
    }
    messagerElement.appendChild(messagerDocument.createElement('br'));
  }

  static logDelay(message, callObject) {
    console.log("delayed message:", message);
    Messager.clearPending();
    pendingLog = setTimeout(() => {
      Messager.log(message, callObject);
    }, 20);
  }

  static clearPending() {
    if (pendingLog) {
      clearTimeout(pendingLog);
      pendingLog = null;
    }
  }

  static clear() {
    while (messagerElement.lastChild) {
      messagerElement.removeChild(messagerElement.lastChild);
    }
  }
}
