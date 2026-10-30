# Guión — Video demostrativo Sisven Cont (~5 minutos)

**Objetivo del video:** que tu supervisor (y los clientes) vean que el sistema
factura, calcula retenciones venezolanas automáticamente, exporta los archivos
oficiales del SENIAT y mantiene la contabilidad cuadrada — sin que el usuario
sepa contabilidad.

**Duración objetivo:** 4:30 – 5:00 minutos. Ritmo tranquilo, sin apurarse.

---

## 1. Antes de grabar (checklist técnico — NO se graba)

```bash
# En una terminal, desde la raíz del proyecto:
npm run dev          # levanta backend (:3000) y frontend (:5173)
```

1. Abrir `http://localhost:5173` en el navegador.
2. Iniciar sesión: `admin@sisven.local` / `Admin123!`
3. En el selector superior **"Empresa"** elegir: **Distribuidora El Roble, C.A. (J-31678900-4)**
4. Verificar que el Dashboard muestra tasa BCV **Bs. 36,50 / USD** (es la tasa
   manual fijada; si el servicio externo estuviera caído, el video no se afecta).
5. Navegador: zoom **110–125%**, ventana maximizada, ocultar barra de marcadores
   (Ctrl+Shift+B), cerrar pestañas ajenas.
6. Grabador: **OBS Studio** o **SimpleScreenRecorder** (ya en Linux), área =
   ventana del navegador, 1080p, micrófono probado 10 segundos.
7. **Ensayar una vez sin grabar.** Si ejecutas la conciliación bancaria en el
   ensayo, restaura las partidas antes de la toma real:
   ```bash
   ./scripts/reset-demo-banco.sh
   ```

> **Ten a mano (papel o nota):**
> - RIF del cliente para la factura en vivo: **J-40123456-9** (Comercial Los Andes, C.A.)
> - Montos de la factura en vivo: base **$850**, IGTF **1079,67**
> - Credenciales: `admin@sisven.local` / `Admin123!`

---

## 2. Guión escena por escena

> La columna **DECIR** es texto literal — léelo tal cual. Los clics están en
> **HACER**. Los tiempos son orientativos; mejor sobrar 30 segundos que cortar.

### Escena 0 — Apertura (0:00 – 0:15)

| | |
|---|---|
| **HACER** | Pantalla de Login ya visible. Escribir usuario y clave, clic en *Iniciar sesión*. |
| **DECIR** | *"Hola, les voy a mostrar Sisven Cont: el sistema contable y tributario que desarrollamos para empresas venezolanas. Maneja bolívares y dólares a la vez, calcula las retenciones del SENIAT automáticamente y genera los archivos oficiales para declarar."* |

Si ya estabas dentro, empieza en el Dashboard y salta a la escena 1.

### Escena 1 — Dashboard (0:15 – 0:40)

| | |
|---|---|
| **HACER** | Quedarte en el Dashboard. Pasear el cursor por las 4 tarjetas de indicadores. |
| **DECIR** | *"Esta es la empresa demo, Distribuidora El Roble. De un vistazo vemos las ventas y compras del mes —doscientos catorce mil y ciento doce mil bolívares—, el IVA que hemos retenido y debemos enterar al SENIAT, y las partidas bancarias pendientes por conciliar. Arriba a la derecha, la tasa oficial del BCV que usa el sistema para la doble moneda."* |
| **Punto de venta** | Todo el negocio en una pantalla; la tasa BCV se actualiza sola. |

### Escena 2 — Emitir factura EN VIVO (0:40 – 1:30)

| | |
|---|---|
| **HACER** | Clic en **Ventas** (menú lateral). Llenar el formulario *Emisión de Factura Fiscal*: <br>· RIF del comprador: `J-40123456-9` <br>· Nombre: `Comercial Los Andes, C.A.` <br>· Montos expresados en: **Divisas (USD)** <br>· Condición: **Contado** · Cobrado en: **Divisas** <br>· Base imponible 16%: `850` <br>· IGTF percibido 3%: `1079.67` <br>· Fecha: hoy. |
| **DECIR** *(mientras escribes)* | *"Vamos a emitir una factura de venta. Escribo el RIF del cliente y fíjense: el sistema lo valida al instante con el algoritmo oficial de dígito verificador; si el RIF estuviera mal escrito, no deja facturar."* |
| **HACER** | Antes de emitir, señalar el panel derecho *Asiento contable en tiempo real*. |
| **DECIR** | *"Y aquí está lo importante: mientras lleno la factura, a la derecha el sistema va armando el asiento contable solo — la caja en el Debe, la venta, el IVA y el impuesto a las divisas en el Haber—, en bolívares y en dólares al mismo tiempo. El contador no tiene que hacer nada."* |
| **HACER** | Clic en **Emitir factura con asiento automático**. Mostrar el mensaje verde de confirmación (factura N° **000006**). |
| **DECIR** | *"Lista. Factura número seis registrada, con su asiento contable ya cuadrado."* |

### Escena 3 — Libros automáticos (1:30 – 2:00)

| | |
|---|---|
| **HACER** | Bajar a la tabla **Libro de Ventas** en la misma página. Señalar la fila nueva y las anteriores. Luego clic en **Libro Diario** (menú Contabilidad) y mostrar el comprobante más reciente. |
| **DECIR** | *"La factura quedó registrada en el Libro de Ventas oficial, con su numeración fiscal y su número de control. Y en el Libro Diario está el comprobante completo: debe igual a haber, siempre. Estos son los libros que exige la ley, y se llenan solos."* |
| **Punto de venta** | Libros fiscales formales sin trabajo manual. |

### Escena 4 — Compras y retenciones (2:00 – 2:45)

| | |
|---|---|
| **HACER** | Clic en **Compras**. Bajar a la tabla *Libro de Compras*. Señalar la compra a *Servicios Generales del Zulia* (F-11023) y la del consultor *Juan Carlos Pérez* (F-0033). |
| **DECIR** | *"Del lado de las compras pasa lo mismo, pero con un plus: como esta empresa es Sujeto Pasivo Especial, el sistema calcula y guarda solo las retenciones. Miren esta factura de veinte mil bolívares: le retuvo el setenta y cinco por ciento del IVA —dos mil cuatrocientos— y además el dos por ciento de ISLR. Y al consultor persona natural le aplicó el tres por ciento menos el sustraendo de la ley. Cada retención tiene su comprobante de catorce dígitos, exactamente como pide la providencia."* |
| **Punto de venta** | Las retenciones IVA/ISLR salen solas — el dolor de cabeza #1 de cualquier empresa venezolana. |

### Escena 5 — Archivos oficiales SENIAT (2:45 – 3:35)

| | |
|---|---|
| **HACER** | Clic en **Libros SENIAT**. Con el período `202610` visible, clic en **Descargar TXT**. Abrir el archivo descargado (editor de texto o gestor de archivos) unos segundos para que se vean las líneas. Volver y clic en **Descargar XML**. |
| **DECIR** | *"A fin de mes no hay que armar nada a mano. Con un clic descargamos el archivo TXT de retenciones de IVA —dieciséis campos por línea, el formato exacto del portal del SENIAT— y el XML de retenciones de ISLR. Se suben tal cual al portal y listo."* |
| **Punto de venta** | Esto normalmente toma horas en Excel; aquí es un botón. |
| **TIP** | Si el cliente no conoce el formato, no hace falta explicarlo: basta mostrar que el archivo existe y tiene datos. |

### Escena 6 — Conciliación bancaria (3:35 – 4:20) ⭐ momento estrella

| | |
|---|---|
| **HACER** | Clic en **Conciliación Bancaria**. Mostrar rápido las dos pestañas: extracto (6 partidas) y libro interno (3 movimientos). Verificar que el campo tasa diga `36.5`. Clic en **Ejecutar conciliación**. Esperar el panel de resultados. |
| **DECIR** *(antes del clic)* | *"Ahora la conciliación bancaria. Tenemos el extracto del banco y nuestro libro interno. Ejecuto la conciliación…"* |
| **DECIR** *(al ver resultados)* | *"…y el sistema cruzó todo en cuatro fases: dos partidas casaron exactas, una por monto y fecha aunque la referencia difiere, detectó automáticamente el cargo de IGTF y la comisión del punto de venta sugiriendo sus asientos… y fíjense en esta alerta roja: hay un abono de cuarenta y un mil quinientos bolívares en el banco que no tiene factura que lo respalde. Eso es exactamente lo que el SENIAT revisa en una fiscalización — el sistema te lo advierte antes que el fisco."* |
| **Punto de venta** | La alerta de riesgo fiscal es lo más memorable del video: vende tranquilidad. |

### Escena 7 — Estados financieros y cierre (4:20 – 5:00)

| | |
|---|---|
| **HACER** | Clic en **Estados Financieros** → botón **Generar**. Señalar la banda verde de cuadre del Balance General. |
| **DECIR** | *"Y para cerrar: los estados financieros listos en cualquier fecha. El Balance General siempre verifica que el Activo sea igual al Pasivo más el Patrimonio —aquí lo ven en cero, cuadrado— y el Estado de Resultados muestra la utilidad del mes, ochenta y seis mil novecientos veinticinco bolívares en este caso."* |
| **DECIR** *(cierre)* | *"En resumen: facturación, retenciones, libros fiscales, conciliación y estados financieros — todo automático, todo cuadrado, todo pensado para Venezuela. Y una misma cuenta puede manejar varias empresas con sus usuarios y permisos. Gracias."* |

---

## 3. Glosario de emergencia (si alguien pregunta)

| Término | Respuesta de una línea |
|---|---|
| **Retención de IVA** | "Cuando una empresa grande nos compra algo, nos descuenta parte del IVA y lo paga directo al SENIAT. El sistema lo calcula solo." |
| **SPE** | "Sujeto Pasivo Especial: una empresa que el SENIAT designa como agente de retención. Por eso nuestras compras generan retenciones." |
| **IGTF** | "Impuesto del 3% que pagan en divisas las empresas. Se suma a la factura cuando cobras en dólares." |
| **Partida doble** | "Toda operación se anota dos veces: de dónde salió y a dónde entró. Por eso los reportes siempre cuadran." |
| **Tasa BCV** | "La tasa oficial del Banco Central. El sistema la consulta solo y convierte todo a las dos monedas." |
| **Comprobante de retención** | "El documento de 14 dígitos que hay que entregarle al proveedor y declarar al SENIAT cada mes." |

## 4. Si algo falla en vivo

- **La API no responde / pantalla en blanco:** *"Un momento, recargo el servicio"* →
  revisa que `npm run dev` siga corriendo; el login vuelve a pedir credenciales.
- **Tasa BCV en "No disponible":** no pasa nada — la empresa usa la tasa manual
  (36,50). Di: *"usamos la tasa fijada por la empresa"*.
- **Error al emitir la factura:** casi siempre es el RIF mal tecleado — vuelve a
  escribir `J-40123456-9` despacio.
- **La conciliación ya estaba ejecutada** (partidas en CONCILIADO): corre
  `./scripts/reset-demo-banco.sh` y repite la escena.
- **Te trabas narrando:** corta la grabación en esa escena — son escenas
  independientes, se pegan en edición. Nadie nota un corte entre menús.

## 5. Preguntas que los clientes suelen hacer

- **"¿Puedo llevar varias empresas?"** — Sí: el selector de arriba cambia de
  empresa y cada una tiene su contabilidad aislada.
- **"¿Sirve para declarar al SENIAT?"** — Genera los archivos TXT y XML en el
  formato oficial para subirlos al portal.
- **"¿Pueden entrar varios usuarios?"** — Sí, con tres roles: Administrador,
  Contador y Consulta (solo lectura).
- **"¿Está en la nube?"** — Hoy corre en servidor propio; la arquitectura está
  lista para desplegarse en nube (soporta PostgreSQL).
- **"¿Qué pasa si me equivoco en una factura?"** — Los asientos se anulan con
  reverso contable y quedan auditados; los períodos cerrados bloquean cambios.

---

### Anexo — Datos exactos de la demo (por si los necesitas en voz alta)

| Dato | Valor |
|---|---|
| Empresa | Distribuidora El Roble, C.A. · J-31678900-4 · SPE 75% |
| Tasa BCV | Bs. 36,50 / USD |
| Ventas de octubre | 5 facturas · Bs. 214.496,83 |
| Compras de octubre | 4 facturas · Bs. 112.288,00 |
| IVA retenido por enterar | Bs. 11.616,00 |
| ISLR retenido | Bs. 737,50 |
| Factura en vivo | N° 000006 · Comercial Los Andes, C.A. · total Bs. 37.068,67 ($ 1.015,58) |
| Comprobantes de retención | 20261000000001 → 20261000000004 |
| Conciliación esperada | 2 exactas · 1 temporal · 1 alerta fiscal · 2 gastos detectados |
| Resultado del ejercicio | Utilidad Bs. 86.925,00 |
| Balance general | Activo 379.984,83 = Pasivo 143.059,83 + Patrimonio 236.925,00 · cuadre 0 |
