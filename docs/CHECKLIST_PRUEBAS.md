# Checklist de pruebas — Sisven Cont

Validación rápida para correr **antes de grabar una demo** o **antes de mostrar
el sistema a un cliente**. Dos niveles: la suite automática (30 segundos) y la
revisión visual por pantalla (5 minutos).

> ⚠️ La suite automática crea empresas temporales ("Smoke Test CA",
> "Empresa Aislada CA"). Úsala sobre una BD de pruebas o acepta que queden
> esos residuos — no afectan a la empresa demo.

## 1. Suite automática

```bash
# Con el backend corriendo (npm run dev -w backend):
./scripts/smoke-test.sh
```

**Resultado esperado:** `38 PASS · 0 FAIL`. Cubre: login y rechazo de claves
malas, creación de empresa y plan de cuentas sembrado (112), venta con asiento
cuadrado, compra con retenciones IVA 75% + ISLR y comprobante de 14 dígitos,
TXT de 16 campos y XML del SENIAT, balance cuadrado, conciliación en 4 fases,
bloqueo de período cerrado, permisos por rol y aislamiento entre empresas.

## 2. Revisión visual por pantalla

Abrir `http://localhost:5173`, entrar con `admin@sisven.local` / `Admin123!`
y seleccionar **Distribuidora El Roble, C.A.** en el selector de empresa.

| Pantalla | Qué verificar | Esperado |
|---|---|---|
| Login | Entrar con clave mala | Mensaje de error en rojo, no entra |
| Dashboard | 4 tarjetas + tasa BCV | Ventas Bs. 214.496,83 · Compras Bs. 112.288 · IVA por enterar Bs. 11.616 · 6 partidas pendientes · tasa 36,50 |
| Ventas | Formulario + vista previa del asiento | El asiento se arma en vivo y cuadra Debe = Haber |
| Ventas | RIF inválido | Aviso "RIF inválido" bajo el campo |
| Ventas | Libro de Ventas | 5+ facturas con correlativo 000001… |
| Compras | Libro de Compras | 4 filas con columnas Ret. IVA y Ret. ISLR pobladas |
| Libros SENIAT | Período `202610` | 4 retenciones IVA · 2 retenciones ISLR; ambos botones descargan archivo |
| Plan de Cuentas | Lista | 112 cuentas con jerarquía indentada |
| Libro Diario | Período 10/2026 | Comprobantes VENTAS, COMPRAS y MANUAL; todos Debe = Haber |
| Asientos Manuales | Cargar un asiento | La banda de cuadre pasa a verde solo cuando Debe = Haber |
| Libro Mayor | Elegir una cuenta | Saldo inicial, movimientos con saldo corrido, saldo final |
| Balance de Comprobación | 10/2026 | Totales Debe = Haber en ambas columnas |
| Estados Financieros | Generar al 31/10/2026 | Banda verde de cuadre en **0**; utilidad neta positiva |
| Períodos Fiscales | 2026 | 12 meses; botón Cerrar (y Reabrir solo para ADMIN) |
| Conciliación Bancaria | Ejecutar | Resumen: 2 exactas · 1 temporal · 1 alerta fiscal · 2 gastos detectados |
| Admin → Empresas | Lista | El Roble como SPE 75%; campo de tasa manual |
| Admin → Usuarios | Crear/activar/desactivar | Se asignan empresas por usuario |

## 3. Verificación multi-rol (opcional pero impresionante)

1. Admin → Usuarios → crear uno con rol **CONSULTA** asignado a El Roble.
2. Cerrar sesión, entrar como ese usuario.
3. **Esperado:** ve todas las pantallas de consulta, pero no aparecen los
   formularios de carga ni el botón "Asientos Manuales" en el menú.

## 4. Verificación de archivos SENIAT (detalle técnico)

```bash
# El TXT debe tener 16 columnas separadas por TAB en cada línea:
curl -s "http://localhost:3000/api/v1/retentions/iva/txt?periodo=202610" \
  -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" | awk -F'\t' '{print NF}'
# → cada línea imprime: 16

# El XML debe iniciar con <RelacionRetencionesISLR RifAgente="J316789004" ...>
```

## 5. Problemas conocidos / notas

- Si la tasa BCV automática falla (sin internet), el Dashboard muestra
  "No disponible": la empresa usa su tasa manual (36,50) y todo sigue
  funcionando.
- Para re-grabar la escena de conciliación: `./scripts/reset-demo-banco.sh`.
- Para recargar toda la demo desde cero: borrar `backend/data/sisven.db`,
  reiniciar el backend y correr `node scripts/seed-demo.mjs`.
