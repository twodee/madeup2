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

      if (callObject) {
        const docsDiv = messagerDocument.createElement('div');
        docsDiv.classList.add('function-docs');

        const nameDiv = messagerDocument.createElement('h3');
        nameDiv.classList.add('function-docs-heading', 'monospace');
        nameDiv.appendChild(messagerDocument.createTextNode(callObject.name));
        docsDiv.appendChild(nameDiv);

        const descriptionDiv = messagerDocument.createElement('div');
        descriptionDiv.classList.add('function-docs-description');
        descriptionDiv.appendChild(messagerDocument.createTextNode(callObject.description));
        docsDiv.appendChild(descriptionDiv);

        const parametersTitleDiv = messagerDocument.createElement('h4');
        parametersTitleDiv.classList.add('function-docs-heading');
        parametersTitleDiv.appendChild(messagerDocument.createTextNode('Parameters'));
        docsDiv.appendChild(parametersTitleDiv);

        if (callObject.parameters.length === 0) {
          docsDiv.appendChild(messagerDocument.createTextNode('None.'))
        } else {
          const grid = messagerDocument.createElement('div');
          grid.classList.add('function-docs-parameter-grid');

          for (let parameter of callObject.parameters) {
            // const parameterDiv = messagerDocument.createElement('div');
            // parameterDiv.classList.add('function-docs-parameter');

            const div = messagerDocument.createElement('div');
            const inputElement = messagerDocument.createElement('input');
            inputElement.classList.add('function-docs-parameter-status');
            inputElement.onclick = () => false;
            inputElement.setAttribute('type', 'checkbox');
            if (parameter.isProvided) {
              inputElement.setAttribute('checked', 'checked');
            } else if (parameter.defaultExpression) {
              inputElement.indeterminate = true;
            }
            div.appendChild(inputElement);
            grid.appendChild(div);

            const nameElement = messagerDocument.createElement('div');
            nameElement.classList.add('monospace', 'function-docs-parameter-name');
            nameElement.appendChild(messagerDocument.createTextNode(`${parameter.name}`));
            grid.appendChild(nameElement);

            const descriptionElement = messagerDocument.createElement('div');
            descriptionElement.classList.add('function-docs-parameter-description');

            if (parameter.description) {
              const descriptionSpan = messagerDocument.createElement('span');
              descriptionSpan.appendChild(messagerDocument.createTextNode(`${parameter.description}`));
              descriptionElement.appendChild(descriptionSpan);
            }

            if (parameter.defaultExpression) {
              const defaultSpan = messagerDocument.createElement('span');  
              defaultSpan.classList.add('function-docs-parameter-default');
              defaultSpan.appendChild(messagerDocument.createTextNode(' Default: '));
              const expressionSpan = messagerDocument.createElement('span');
              expressionSpan.classList.add('monospace');
              expressionSpan.appendChild(messagerDocument.createTextNode(parameter.defaultExpression));
              defaultSpan.appendChild(expressionSpan);
              descriptionElement.appendChild(defaultSpan);
            }

            grid.appendChild(descriptionElement);
          }

          docsDiv.appendChild(grid);
        }

        const returnTitleDiv = messagerDocument.createElement('h4');
        returnTitleDiv.classList.add('function-docs-heading');
        returnTitleDiv.appendChild(messagerDocument.createTextNode('Returns'));
        docsDiv.appendChild(returnTitleDiv);

        if (callObject.returns) {
          docsDiv.appendChild(messagerDocument.createTextNode(callObject.returns))
        } else {
          docsDiv.appendChild(messagerDocument.createTextNode('None.'))
        }

        messagerElement.appendChild(docsDiv);
      }
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
