// Simple transform that converts ES module exports to CommonJS for Jest
module.exports = {
  process(source) {
    // Replace 'export function' with 'function' and add module.exports at end
    const exports = [];
    const transformed = source.replace(/export\s+function\s+(\w+)/g, (_, name) => {
      exports.push(name);
      return 'function ' + name;
    });
    const cjsExports = exports.length > 0
      ? '\nif (typeof module !== "undefined" && module.exports) { module.exports = { ' + exports.join(', ') + ' }; }'
      : '';
    return { code: transformed + cjsExports };
  },
};
