// --------------------------------------------------------------------------- 

export class MessagedException extends Error {
  constructor(message) {
    super(message);
  }

  get userMessage() {
    return this.message;
  }
}

// --------------------------------------------------------------------------- 

export class LocatedException extends MessagedException {
  constructor(where, message) {
    super(message);
    this.where = where;
  }

  get userMessage() {
    return `${this.where.debugPrefix()}${this.message}`;
  }
}

// --------------------------------------------------------------------------- 

export class FunctionDefinition {
  constructor(name, formals, body) {
    this.name = name;
    this.formals = formals;
    this.body = body;
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

