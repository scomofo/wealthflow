// Simple transform that converts ES module exports to CommonJS for Jest
module.exports = {
  process(source) {
    // Minimal renderer ESM to CommonJS transform for Jest.
    const exports = [];
    let transformed = source
      .replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g, (_, names, path) => {
        return 'const {' + names.trim() + "} = require('" + path + "');";
      })
      .replace(/export\s+async\s+function\s+(\w+)/g, (_, name) => {
        exports.push(name);
        return 'async function ' + name;
      })
      .replace(/export\s+function\s+(\w+)/g, (_, name) => {
        exports.push(name);
        return 'function ' + name;
      })
      .replace(/export\s+const\s+(\w+)\s+=/g, (_, name) => {
        exports.push(name);
        return 'const ' + name + ' =';
      });
    const cjsExports = exports.length > 0
      ? '\nif (typeof module !== "undefined" && module.exports) { module.exports = { ' + exports.join(', ') + ' }; }'
      : '';
    return { code: transformed + cjsExports };
  },
};
