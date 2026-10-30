"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STANDARD_ACCOUNT_LEAVES = void 0;
exports.accountLevel = accountLevel;
exports.parentCodeOf = parentCodeOf;
exports.buildStandardChart = buildStandardChart;
exports.STANDARD_ACCOUNT_LEAVES = [
    { code: '1.1.01.01.00.000', name: 'Caja Chica / Custodia Divisas', niif: 'Efectivo y equivalentes' },
    { code: '1.1.01.02.01.000', name: 'Bancos Nacionales Moneda Cta Cte (VES)', niif: 'Efectivo y equivalentes' },
    { code: '1.1.01.02.02.000', name: 'Bancos Nacionales Moneda Extranjera (USD)', niif: 'Efectivo y equivalentes' },
    { code: '1.1.02.01.01.000', name: 'Cuentas por Cobrar Comerciales Nacionales', niif: 'Deudores comerciales' },
    { code: '1.1.02.02.01.000', name: '(-) Estimación para Cuentas de Cobro Dudosas', niif: 'Deudores comerciales' },
    { code: '1.1.03.01.01.000', name: 'Retenciones de IVA Acumuladas por Compensar', niif: 'Otros activos' },
    { code: '1.1.03.01.02.000', name: 'Retenciones de ISLR Sufridas en el Ejercicio', niif: 'Otros activos' },
    { code: '1.1.03.01.03.000', name: 'Anticipos de ISLR (Declaración Estimada)', niif: 'Otros activos' },
    { code: '1.1.03.02.01.000', name: 'Crédito Fiscal IVA (16%)', niif: 'Otros activos' },
    { code: '1.1.04.01.01.000', name: 'Inventario de Mercancía / Productos Terminados', niif: 'Inventarios' },
    { code: '1.2.01.01.01.000', name: 'Propiedades, Planta y Equipo (Maquinarias)', niif: 'PPE' },
    { code: '1.2.01.01.02.000', name: '(-) Depreciación Acumulada PPE', niif: 'PPE' },
    { code: '2.1.01.01.01.000', name: 'Cuentas por Pagar Proveedores Nacionales', niif: 'Acreedores comerciales' },
    { code: '2.1.02.01.01.000', name: 'Débito Fiscal IVA (16%)', niif: 'Obligaciones fiscales' },
    { code: '2.1.02.01.02.000', name: 'IVA Retenido a Proveedores por Enterar', niif: 'Obligaciones fiscales' },
    { code: '2.1.02.01.03.000', name: 'Retenciones de ISLR por Pagar a Terceros', niif: 'Obligaciones fiscales' },
    { code: '2.1.02.01.04.000', name: 'IGTF por Pagar / Enterar (3% Percibido)', niif: 'Obligaciones fiscales' },
    { code: '3.1.01.01.00.000', name: 'Capital Social Pagado (Nominal)', niif: 'Capital' },
    { code: '3.1.01.02.00.000', name: 'Actualización del Capital Social (Ajuste)', niif: 'Capital' },
    { code: '3.2.01.01.00.000', name: 'Reserva Legal', niif: 'Reservas' },
    { code: '3.3.01.01.00.000', name: 'Resultados Acumulados / Utilidades Retenidas', niif: 'Resultados' },
    { code: '3.3.02.01.00.000', name: 'Resultado por Exposición a la Inflación', niif: 'Resultados' },
    { code: '4.1.01.01.01.000', name: 'Ventas de Mercancías Gravadas (Alícuota 16%)', niif: 'Ingresos ordinarios' },
    { code: '4.1.01.01.02.000', name: 'Ventas de Mercancías Exentas', niif: 'Ingresos ordinarios' },
    { code: '4.1.01.02.01.000', name: 'Otros Ingresos Operacionales', niif: 'Ingresos ordinarios' },
    { code: '5.1.01.01.00.000', name: 'Costo de Ventas / Mercancías Vendidas', niif: 'Costo de ventas' },
    { code: '6.1.01.01.01.000', name: 'Sueldos y Salarios', niif: 'Gastos de personal' },
    { code: '6.1.02.01.01.000', name: 'Gastos por Comisiones Bancarias', niif: 'Gastos financieros' },
    { code: '6.1.02.01.02.000', name: 'Gastos por Impuesto IGTF Bancario (No Deducible)', niif: 'Gastos financieros' },
    { code: '6.1.03.01.01.000', name: 'Gastos por Mantenimiento y Servicios', niif: 'Gastos operativos' },
];
const GROUP_NAMES = {
    '1': 'ACTIVO',
    '1.1': 'ACTIVO CORRIENTE',
    '1.1.01': 'EFECTIVO Y EQUIVALENTES',
    '1.1.02': 'CUENTAS POR COBRAR',
    '1.1.03': 'IMPUESTOS POR RECUPERAR',
    '1.1.04': 'INVENTARIOS',
    '1.2': 'ACTIVO NO CORRIENTE',
    '1.2.01': 'PROPIEDADES, PLANTA Y EQUIPO',
    '2': 'PASIVO',
    '2.1': 'PASIVO CORRIENTE',
    '2.1.01': 'CUENTAS POR PAGAR COMERCIALES',
    '2.1.02': 'IMPUESTOS Y OBLIGACIONES POR PAGAR',
    '3': 'PATRIMONIO',
    '3.1': 'CAPITAL SOCIAL',
    '3.2': 'RESERVAS',
    '3.3': 'RESULTADOS',
    '4': 'INGRESOS',
    '4.1': 'INGRESOS OPERACIONALES',
    '5': 'COSTOS',
    '5.1': 'COSTO DE VENTAS',
    '6': 'GASTOS',
    '6.1': 'GASTOS DE OPERACIÓN',
    '6.1.01': 'GASTOS DE PERSONAL',
    '6.1.02': 'GASTOS BANCARIOS Y TRIBUTARIOS',
    '6.1.03': 'GASTOS DE SERVICIOS GENERALES',
};
const NATURE_BY_CLASS = {
    '1': 'DEUDORA', '5': 'DEUDORA', '6': 'DEUDORA',
    '2': 'ACREEDORA', '3': 'ACREEDORA', '4': 'ACREEDORA',
};
const LEVEL_LENGTHS = [1, 3, 6, 9, 12, 16];
function accountLevel(code) {
    return LEVEL_LENGTHS.findIndex((len) => code.length === len) + 1;
}
function parentCodeOf(code) {
    const level = accountLevel(code);
    if (level <= 1)
        return null;
    return code.substring(0, LEVEL_LENGTHS[level - 2]);
}
const NATURE_OVERRIDES = {
    '1.1.02.02.01.000': 'ACREEDORA',
    '1.2.01.01.02.000': 'ACREEDORA',
};
function buildStandardChart() {
    const result = new Map();
    for (const leaf of exports.STANDARD_ACCOUNT_LEAVES) {
        const chain = [];
        let code = leaf.code;
        while ((code = parentCodeOf(code)) !== null)
            chain.unshift(code);
        for (const pcode of chain) {
            if (!result.has(pcode)) {
                result.set(pcode, {
                    code: pcode,
                    name: GROUP_NAMES[pcode] ?? `Grupo ${pcode}`,
                    level: accountLevel(pcode),
                    parentCode: parentCodeOf(pcode),
                    nature: NATURE_BY_CLASS[pcode[0]] ?? 'DEUDORA',
                    isSelectable: false,
                });
            }
        }
        result.set(leaf.code, {
            ...leaf,
            level: 6,
            parentCode: parentCodeOf(leaf.code),
            nature: NATURE_OVERRIDES[leaf.code] ?? NATURE_BY_CLASS[leaf.code[0]] ?? 'DEUDORA',
            isSelectable: true,
        });
    }
    return [...result.values()].sort((a, b) => a.code.localeCompare(b.code));
}
//# sourceMappingURL=standard-accounts.js.map