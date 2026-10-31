# Manual de Uso — Sisven Cont

Guía para los usuarios contadores que evaluarán el sistema. Sisven Cont es un sistema contable y tributario para PyMEs venezolanas: facturación con IGTF, retenciones de IVA e ISLR, libros SENIAT, contabilidad VEN-NIF bimoneda (Bs./USD) y conciliación bancaria.

---

## 1. Acceso al sistema

1. Abra en el navegador la URL que le indicó el administrador (`https://...`).
2. Ingrese su **correo** y **contraseña** (el administrador se los entregó).
3. Pulse **Ingresar**.

> No existe registro público. Si no tiene credenciales, solicítelas al administrador del sistema.

## 2. Concepto clave: una sola empresa compartida

- **Todos los usuarios trabajan sobre la misma empresa.** Lo que un usuario registre (una venta, un asiento, un movimiento bancario) lo verán los demás de inmediato.
- Al entrar, seleccione la empresa en el **selector "Empresa"** de la barra superior. Sin empresa seleccionada no se muestran los módulos.
- El sistema soporta múltiples empresas, pero para esta evaluación solo hay una — **cuidado con lo que registren: los datos son compartidos y reales para todos.**

## 3. Roles y permisos

| Acción | CONTADOR | CONSULTA |
|---|---|---|
| Ver todos los módulos, reportes y libros | Sí | Sí |
| Emitir facturas de venta | Sí | No |
| Registrar compras y retenciones | Sí | No |
| Crear asientos manuales | Sí | No |
| Cuentas bancarias, extractos, conciliar | Sí | No |
| Crear cuentas del plan (auxiliares) | Sí | No |
| Descargar TXT de retención IVA / XML ISLR | Sí | Sí |
| Cerrar períodos fiscales | Sí | No |
| Reabrir períodos, gestionar usuarios y empresas | Solo ADMIN | Solo ADMIN |

El usuario **CONSULTA** no verá los formularios de registro — es un perfil de auditoría/revisión. Si intenta una operación de escritura, el sistema la rechaza.

## 4. Tour por los módulos

### 4.1 Dashboard

Panel general: ventas y compras del mes en curso, IVA retenido por enterar (si la empresa es agente de retención), partidas bancarias pendientes de conciliar y la condición tributaria de la empresa (SPE y su % de retención).

### 4.2 Ventas — Emisión de factura fiscal

Formulario de factura con los siguientes campos:

- **Fecha** y **Tasa BCV** del día.
- **RIF del comprador** — debe ser un RIF válido según Módulo 11 (ver §5). El sistema avisa en rojo si el dígito verificador no cuadra.
- **Montos expresados en**: Divisas (USD) o Bolívares. Siempre se convierte a Bs. con la tasa BCV indicada.
- **Condición**: Contado o Crédito.
- **Cobrado en** (solo a contado): si elige **Divisas**, aplica el IGTF (Impuesto a las Grandes Transacciones Financieras, 3%).
- **Base imponible 16%**, **Ventas exentas** e **IGTF percibido** en bolívares.

A la derecha se muestra **el asiento contable en tiempo real** que se generará (caja/cuentas por cobrar, ventas, débito fiscal, IGTF). Al pulsar **"Emitir factura con asiento automático"** la operación queda en el **Libro de Ventas** y contabilizada sin pasos extra.

### 4.3 Compras — Factura de proveedor con retenciones

- **RIF del proveedor** (también validado por Módulo 11), Razón Social, **N° Factura** y **N° Control**.
- **Cuenta de gasto**: selector con las cuentas del grupo 6 (gastos) del plan VEN-NIF.
- **Montos en** VES o USD con la tasa BCV.
- **Concepto ISLR (Decreto 1808)**: conceptos 001, 002, 018, 020, 055 y 057 (honorarios, comisiones y servicios PN/PJ). El porcentaje de retención se aplica automáticamente; para personas naturales residentes se usa el **sustraendo en Unidades Tributarias** — indique el **Valor UT** del día.
- Si la empresa es **SPE (agente de retención de IVA)**, la retención de IVA (75% o 100%) se calcula y registra sola.

El panel **"Resumen de retenciones"** muestra base, IVA, retenciones practicadas y **neto a pagar** antes de registrar. El asiento se genera automáticamente (gasto, crédito fiscal, retenciones por pagar, banco/cuentas por pagar).

### 4.4 Libros SENIAT — Retenciones y archivos oficiales

- Listado de **retenciones de IVA e ISLR practicadas** en el período seleccionado.
- **Archivo TXT — Retenciones de IVA**: formato oficial de la Providencia SNAT/2025/000054, listo para declarar en el portal del SENIAT.
- **Archivo XML — Retenciones de ISLR**: formato del Decreto 1808.
- Ambos archivos pueden descargarlos también los usuarios CONSULTA.

### 4.5 Contabilidad

- **Plan de Cuentas**: estructura VEN-NIF PYME precargada al crear la empresa. Permite crear **cuentas auxiliares (nivel 6)** bajo los padres existentes.
- **Libro Diario**: asientos legales numerados en orden cronológico — ventas, compras y manuales aparecen aquí.
- **Asientos Manuales**: comprobantes de partida doble **bimoneda** (cada línea lleva cuenta, tercero opcional por RIF, debe y haber en Bs. y USD). El comprobante no se asienta si no cuadra.
- **Libro Mayor**: movimientos y saldo por cuenta.
- **Balance de Comprobación**: sumas y saldos del período.
- **Estados Financieros**: Balance General (activos/pasivos/patrimonio por grupos) y Estado de Resultados (ingresos, costos, gastos) del rango seleccionado.
- **Períodos Fiscales**: los 12 meses del ejercicio se crearon con la empresa. **Cerrar** un período bloquea nuevos asientos en él; **reabrir** es exclusivo del ADMIN.

### 4.6 Tesorería — Conciliación bancaria

1. **Cuentas bancarias**: agregue banco, N° de cuenta y moneda (VES/USD).
2. **Extracto bancario**: cargue las partidas del estado de cuenta (fecha, referencia, descripción, abono/cargo, monto).
3. **Libro interno**: movimientos registrados en la contabilidad (fecha, referencia, concepto, tipo, monto y N° de factura asociada — esta última permite el cruce fiscal).
4. **Ejecutar conciliación**: motor de 4 fases:
   - *Fase 1 — exacta*: monto + referencia idénticos.
   - *Fase 2 — temporal*: mismo monto con tolerancia de días (partidas en tránsito).
   - *Fase 3 — cruce fiscal*: alerta movimientos de banco vinculados a facturas sin asiento, o viceversa.
   - *Fase 4 — gastos automáticos*: detecta comisiones/ITF/retenciones del banco que deben contabilizarse.
5. Lo que no cuadre automáticamente puede **cuadrarse manual** desde el botón de cada partida pendiente.

## 5. Regla del RIF (importante para las pruebas)

El sistema valida todo RIF con el **algoritmo oficial del SENIAT (Módulo 11)**: letra (V, E, J, P, G o C) + 8 dígitos + dígito verificador calculado. Por eso un RIF inventado como `J-11111111-1` se rechaza — el último dígito debe ser matemáticamente correcto. En producción se usan RIFs reales, que siempre pasan.

**Para las pruebas, use estos RIFs válidos ya verificados:**

| RIF | Uso sugerido |
|---|---|
| J-29887123-7 | Cliente / proveedor |
| J-30567891-0 | Cliente / proveedor |
| J-31445566-4 | Cliente / proveedor |
| J-31678900-4 | Cliente / proveedor |
| J-40199288-9 | Cliente / proveedor |
| J-40331122-6 | Cliente / proveedor |
| J-40777555-3 | Cliente / proveedor |
| J-41208765-7 | Cliente / proveedor |
| V-15432109-4 | Persona natural (honorarios) |
| J-00006372-9 | Proveedor |
| G-20000303-0 | Ente gubernamental |
| V-12345678-1 | Persona natural |

Notas:

- `J-40123456-9` ya está usado por la empresa registrada — no puede repetirse (el RIF debe ser único).
- Cada comprador/proveedor debe tener su propio RIF del listado o uno real.

## 6. Ruta de prueba sugerida

Orden recomendado para evaluar el sistema de punta a punta:

1. **Entrar** con sus credenciales y seleccionar la empresa.
2. **Ventas**: emitir una factura a `J-29887123-7`, a crédito, base imponible en USD — observe el asiento en tiempo real.
3. Emitir otra **a contado cobrada en divisas** y verifique el IGTF 3% en el asiento.
4. **Compras**: registrar una factura de `J-30567891-0` con concepto ISLR `057` (servicios PJ, 2%) — revise el neto a pagar.
5. Registrar otra compra a `V-15432109-4` con concepto `001` (honorarios PN, 3% + sustraendo UT).
6. **Libro Diario**: confirmar que los 4 documentos generaron asientos cuadrados.
7. **Asientos Manuales**: crear un comprobante simple (ej. pago de nómina) y verificar que rechaza uno descuadrado.
8. **Tesorería**: crear una cuenta bancaria, cargar 2-3 partidas de extracto que coincidan con movimientos internos, **Ejecutar conciliación** y revisar las 4 fases.
9. **Libros SENIAT**: descargar el TXT de retenciones IVA y el XML de ISLR del período.
10. **Reportes**: Balance de Comprobación, Estados Financieros y Libro Mayor — deben reflejar todo lo registrado.
11. **Períodos Fiscales**: cerrar el mes e intente registrar una venta en él — el sistema lo impedirá.

## 7. Preguntas frecuentes

**No veo ningún módulo / datos.**
→ Seleccione la empresa en el selector superior de la pantalla.

**No me aparece el formulario de ventas/compras.**
→ Su usuario es CONSULTA (solo lectura). Ese rol revisa y descarga, pero no registra operaciones — es deliberado.

**El RIF me sale "inválido".**
→ El dígito verificador no cuadra con el Módulo 11. Use un RIF real o uno de la tabla de la sección 5.

**¿Los datos que registro son solo míos?**
→ No. Es una empresa compartida: lo que registre lo ven todos los usuarios. Coordínense para no pisarse las pruebas.

**¿Puedo equivocarme y dañar algo?**
→ Es un entorno de demostración; puede operar con libertad. Las operaciones quedan trazadas en el Libro Diario y pueden anularse si hace falta.

---

*Sisven Cont — Contabilidad VEN-NIF PyME · Retenciones SENIAT · Bimoneda BCV*
