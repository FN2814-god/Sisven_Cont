"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decimalColumn = exports.numericTransformer = void 0;
exports.numericTransformer = {
    to: (value) => value,
    from: (value) => value === null || value === undefined ? null : parseFloat(String(value)),
};
const decimalColumn = (precision = 18, scale = 2) => ({ type: 'decimal', precision, scale, transformer: exports.numericTransformer });
exports.decimalColumn = decimalColumn;
//# sourceMappingURL=numeric.transformer.js.map