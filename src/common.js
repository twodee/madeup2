// --------------------------------------------------------------------------- 

export class MessagedException extends Error {
  constructor(message, callRecord) {
    super(message);
    this.callRecord = callRecord;
  }

  get userMessage() {
    return this.message;
  }
}

// --------------------------------------------------------------------------- 

export class LocatedException extends MessagedException {
  constructor(where, message, callRecord) {
    super(message, callRecord);
    this.where = where;
  }

  get userMessage() {
    return `${this.where.debugPrefix()}${this.message}`;
  }
}

// --------------------------------------------------------------------------- 

export class FunctionDefinition {
  constructor(name, description, formals, body) {
    this.name = name;
    this.description = description;
    this.formals = formals;
    this.body = body;
  }

  toDocString(environment) {
    const div = doc.createElement('div');

    const name = doc.createElement('div');
    name.appendChild(doc.createTextNode(this.name));
    div.appendChild(name);

    for (let f of this.formals) {
      div.appendChild(f.toDocString(doc, environment));
    }

    return div;
    // return this.name + "\n" + this.formals.map(f => f.toDocString(environment)).join("\n");
  }

  toCallRecord(env) {
    return {
      name: this.name,
      description: this.description,
      parameters: this.formals.map(f => f.toCallRecord(env)),
    };
  }
}

// --------------------------------------------------------------------------- 

export class FormalParameter {
  constructor(name, description, defaultThunk) {
    this.name = name;
    this.defaultThunk = defaultThunk;
    this.description = description;
  }

  toDocString(doc, environment) {
    const input = document.createElement('input');
    input.addAttribute('type', 'checkbox');

    if (environment.ownsVariable(this.name)) {
      input.addAttribute('checked');
    } else if (this.defaultThunk) {
      input.indeterminate = true;
    }

    // return `<input type="checkbox" ${environment.ownsVariable(this.name) ? 'checked' : (this.defaultThunk ? 'indeterminate' : '')}> ${this.name}`;
    
    const text = doc.createTextNode(` ${this.name}`);

    const div = doc.createElement('div');
    div.appendChild(input);
    div.appendChild(text);

    return div;
  }

  toCallRecord(env) {
    return {
      name: this.name,
      isProvided: env.ownsVariable(this.name),
      defaultExpression: this.defaultThunk?.toPretty(),
      description: this.description,
    };
  }
}

// --------------------------------------------------------------------------- 

export class Turtle {
  constructor(position, heading) {
    this.position = position;
    this.heading = heading;
  }
}

// --------------------------------------------------------------------------- 

export const Precedence = Object.freeze({
  Atom: 100,
  Property: 99,
  Call: 98, // TODO?
  Power: 95,
  Not: 90,
  Multiplicative: 80,
  Additive: 70,
  Shift: 65,
  And: 60,
  Or: 59,
  Relational: 50,
  Equality: 45,
  Assignment: 15,
});

// --------------------------------------------------------------------------- 

export const mop = (object, xform) => Object.fromEntries(Object.entries(object).map(([key, value]) => [key, xform(value)]));

// --------------------------------------------------------------------------- 

export function removeClassMembers(root, className) {
  if (root.classList.contains(className)) {
    root.parentNode.removeChild(root);
  } else {
    for (let i = root.childNodes.length - 1; i >= 0; --i) {
      if (root.childNodes[i].nodeType == Node.ELEMENT_NODE) {
        removeClassMembers(root.childNodes[i], className);
      }
    }
  }
}

// --------------------------------------------------------------------------- 

Number.prototype.toShortFloat = function() {
  return parseFloat(this.toLocaleString('fullwide', {useGrouping: false, maximumFractionDigits: 3}));
}

// --------------------------------------------------------------------------- 

export function standardizeDegrees(degrees) {
  if (degrees < 0) {
    while (degrees <= -360) {
      degrees += 360;
    }
  } else {
    while (degrees >= 360) {
      degrees -= 360;
    }
  }

  return degrees;
}

// --------------------------------------------------------------------------- 

export function classifyArc(degrees) {
  if (degrees < 0) {
    return {
      isLarge: degrees < -180 ? 1 : 0,
      isClockwise: 1,
    };
  } else {
    return {
      isLarge: degrees > 180 ? 1 : 0,
      isClockwise: 0,
    };
  }
}

// --------------------------------------------------------------------------- 

export function sentenceCase(s) {
  if (s.length > 0) {
    return s.charAt(0).toUpperCase() + s.substring(1);
  } else {
    return s;
  }
}

// --------------------------------------------------------------------------- 

export const RenderMode = Object.freeze({
  Pathify: 'Pathify',
  Solidify: 'Solidify',
});

// --------------------------------------------------------------------------- 

export function removeChildren(root) {
  let lastChild;
  while (lastChild = root.lastChild) {
    root.removeChild(lastChild);
  }
}

// --------------------------------------------------------------------------- 

