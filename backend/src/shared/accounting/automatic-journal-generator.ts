import {
  JournalEntryDto,
  JournalEntryLineDto,
  InvoiceIssuedEvent,
  PaymentReceivedEvent,
  SupplierPurchaseEvent,
} from './types';
import { BcvExchangeService } from '../seniat/bcv-service';

/**
 * Catálogo de Cuentas Estándar VEN-NIF PYME (BA VEN-NIF 8)
 */
export const STANDARD_ACCOUNTS = {
  CAJA_CUSTODIA_DIVISAS: { code: '1.1.01.01.00.000', name: 'Caja Chica / Custodia Divisas' },
  BANCOS_NACIONALES_VES: { code: '1.1.01.02.01.000', name: 'Bancos Nacionales Moneda Cta Cte (VES)' },
  BANCOS_NACIONALES_USD: { code: '1.1.01.02.02.000', name: 'Bancos Nacionales Moneda Extranjera (USD)' },
  CXC_COMERCIALES_NACIONALES: { code: '1.1.02.01.01.000', name: 'Cuentas por Cobrar Comerciales Nacionales' },
  RETENCIONES_IVA_COMPENSAR: { code: '1.1.03.01.01.000', name: 'Retenciones de IVA Acumuladas por Compensar' },
  CREDITO_FISCAL_IVA_16: { code: '1.1.03.02.01.000', name: 'Crédito Fiscal IVA (16%)' },
  CXP_PROVEEDORES_NACIONALES: { code: '2.1.01.01.01.000', name: 'Cuentas por Pagar Proveedores Nacionales' },
  DEBITO_FISCAL_IVA_16: { code: '2.1.02.01.01.000', name: 'Débito Fiscal IVA (16%)' },
  IVA_RETENIDO_PROVEEDORES_ENTERAR: { code: '2.1.02.01.02.000', name: 'IVA Retenido a Proveedores por Enterar' },
  RETENCIONES_ISLR_PAGAR: { code: '2.1.02.01.03.000', name: 'Retenciones de ISLR por Pagar' },
  IGTF_POR_PAGAR_ENTERAR_3: { code: '2.1.02.01.04.000', name: 'IGTF por Pagar / Enterar (3% Percibido)' },
  VENTAS_GRAVADAS_16: { code: '4.1.01.01.01.000', name: 'Ventas de Mercancías Gravadas (Alícuota 16%)' },
  GASTOS_COMISIONES_BANCARIAS: { code: '6.1.02.01.01.000', name: 'Gastos por Comisiones Bancarias' },
  GASTOS_IGTF_BANCARIO: { code: '6.1.02.01.02.000', name: 'Gastos por Impuesto IGTF Bancario (No Deducible)' },
  GASTOS_SERVICIOS_GENERALES: { code: '6.1.03.01.01.000', name: 'Gastos por Mantenimiento y Servicios' },
};

/**
 * Interfaz para la persistencia transaccional de comprobantes contables
 */
export interface IJournalRepository {
  getNextEntryNumber(tenantId: string, fiscalYear: number): Promise<number>;
  saveEntry(entry: JournalEntryDto): Promise<JournalEntryDto>;
}

/**
 * Motor de Generación de Asientos Contables Automáticos (VEN-NIF PYME)
 * Aplica principios SOLID y garantiza la partida doble estricta en bimoneda (VES y USD).
 */
export class AutomaticJournalGenerator {
  constructor(private readonly journalRepo?: IJournalRepository) {}

  /**
   * Valida rigurosamente la partida doble (Débitos == Créditos) tanto en VES como en USD.
   */
  public static assertDoubleEntryBalance(lines: JournalEntryLineDto[]): void {
    if (lines.length < 2) {
      throw new Error(`Un comprobante contable debe poseer al menos 2 líneas para cumplir la partida doble.`);
    }

    let sumDebitVes = 0.0;
    let sumCreditVes = 0.0;
    let sumDebitUsd = 0.0;
    let sumCreditUsd = 0.0;

    for (const l of lines) {
      sumDebitVes = BcvExchangeService.round(sumDebitVes + l.debitVes, 2);
      sumCreditVes = BcvExchangeService.round(sumCreditVes + l.creditVes, 2);
      sumDebitUsd = BcvExchangeService.round(sumDebitUsd + l.debitUsd, 2);
      sumCreditUsd = BcvExchangeService.round(sumCreditUsd + l.creditUsd, 2);
    }

    const diffVes = Math.abs(BcvExchangeService.round(sumDebitVes - sumCreditVes, 2));
    const diffUsd = Math.abs(BcvExchangeService.round(sumDebitUsd - sumCreditUsd, 2));

    if (diffVes !== 0.0) {
      throw new Error(
        `Descuadre contable en VES: Total Débito=${sumDebitVes}, Total Crédito=${sumCreditVes}. Diferencia=${diffVes}`
      );
    }

    if (diffUsd !== 0.0) {
      throw new Error(
        `Descuadre contable en USD: Total Débito=${sumDebitUsd}, Total Crédito=${sumCreditUsd}. Diferencia=${diffUsd}`
      );
    }
  }

  /**
   * Evento A: Factura de Venta a Crédito en Divisas
   * DEBE: Cuentas por Cobrar Comerciales Nacionales (Total Facturado)
   * HABER: Ventas de Mercancías Gravadas 16% (Base Imponible)
   * HABER: Débito Fiscal IVA 16% (IVA Facturado)
   */
  public generateSaleInvoiceEntry(event: InvoiceIssuedEvent, entryNumber: number = 1): JournalEntryDto {
    const { tenantId, invoiceNumber, date, customerRif, customerName, bcvExchangeRate } = event;

    const baseImponibleUsd = BcvExchangeService.round(event.baseImponibleUsd, 2);
    const vatAmountUsd = BcvExchangeService.round(event.vatAmountUsd, 2);
    const totalAmountUsd = BcvExchangeService.round(baseImponibleUsd + vatAmountUsd, 2);

    const baseImponibleVes = BcvExchangeService.convertUsdToVes(baseImponibleUsd, bcvExchangeRate);
    const vatAmountVes = BcvExchangeService.convertUsdToVes(vatAmountUsd, bcvExchangeRate);
    const totalAmountVes = BcvExchangeService.round(baseImponibleVes + vatAmountVes, 2);

    const lines: JournalEntryLineDto[] = [
      {
        accountCode: STANDARD_ACCOUNTS.CXC_COMERCIALES_NACIONALES.code,
        accountName: STANDARD_ACCOUNTS.CXC_COMERCIALES_NACIONALES.name,
        description: `CxC Factura N° ${invoiceNumber} - ${customerName}`,
        debitVes: totalAmountVes,
        creditVes: 0.0,
        debitUsd: totalAmountUsd,
        creditUsd: 0.0,
        bcvRate: bcvExchangeRate,
        thirdPartyRif: customerRif,
      },
      {
        accountCode: STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.code,
        accountName: STANDARD_ACCOUNTS.VENTAS_GRAVADAS_16.name,
        description: `Venta según Factura N° ${invoiceNumber}`,
        debitVes: 0.0,
        creditVes: baseImponibleVes,
        debitUsd: 0.0,
        creditUsd: baseImponibleUsd,
        bcvRate: bcvExchangeRate,
        thirdPartyRif: customerRif,
      },
      {
        accountCode: STANDARD_ACCOUNTS.DEBITO_FISCAL_IVA_16.code,
        accountName: STANDARD_ACCOUNTS.DEBITO_FISCAL_IVA_16.name,
        description: `Débito Fiscal IVA 16% Factura N° ${invoiceNumber}`,
        debitVes: 0.0,
        creditVes: vatAmountVes,
        debitUsd: 0.0,
        creditUsd: vatAmountUsd,
        bcvRate: bcvExchangeRate,
        thirdPartyRif: customerRif,
      },
    ];

    AutomaticJournalGenerator.assertDoubleEntryBalance(lines);

    const year = parseInt(date.substring(0, 4), 10);
    const period = parseInt(date.substring(5, 7), 10);

    return {
      tenantId,
      fiscalYear: year,
      fiscalPeriod: period,
      entryNumber,
      entryDate: date,
      concept: `Registro de Factura de Venta N° ${invoiceNumber} a crédito en divisas a cliente ${customerName}`,
      sourceModule: 'VENTAS',
      sourceDocumentId: event.invoiceId,
      status: 'ASENTADO',
      bcvExchangeRate,
      lines,
      totalDebitVes: totalAmountVes,
      totalCreditVes: totalAmountVes,
      totalDebitUsd: totalAmountUsd,
      totalCreditUsd: totalAmountUsd,
    };
  }

  /**
   * Evento B: Cobro en efectivo/divisas con Retención de IVA (75%) e IGTF (3% percibido)
   * DEBE: Caja Chica / Custodia Divisas (Monto Neto Cobrado en divisas + IGTF Percibido)
   * DEBE: Retenciones de IVA acumuladas por Compensar (75% retenido por cliente SPE)
   * HABER: Cuentas por Cobrar Comerciales Nacionales (Cancelación del saldo facturado)
   * HABER: IGTF por Pagar / Enterar (3% percibido sobre divisas cobradas)
   */
  public generatePaymentReceivedEntry(event: PaymentReceivedEvent, entryNumber: number = 1): JournalEntryDto {
    const {
      tenantId,
      receiptNumber,
      date,
      customerRif,
      customerName,
      bcvExchangeRate,
    } = event;

    const totalInvoiceVes = BcvExchangeService.round(event.totalInvoiceAmountVes, 2);
    const totalInvoiceUsd = BcvExchangeService.round(event.totalInvoiceAmountUsd, 2);

    const ivaRetentionVes = BcvExchangeService.round(event.ivaRetentionVes, 2);
    const ivaRetentionUsd = BcvExchangeService.round(event.ivaRetentionUsd, 2);

    const igtfVes = BcvExchangeService.round(event.igtfPercibidoVes, 2);
    const igtfUsd = BcvExchangeService.round(event.igtfPercibidoUsd, 2);

    // Saldo neto a cobrar de la factura = Total Factura - Retención IVA
    const netoCobrarFacturaVes = BcvExchangeService.round(totalInvoiceVes - ivaRetentionVes, 2);
    const netoCobrarFacturaUsd = BcvExchangeService.round(totalInvoiceUsd - ivaRetentionUsd, 2);

    // Monto final que ingresa a Caja / Banco = Neto Factura + IGTF 3% Percibido
    const totalIngresoCajaVes = BcvExchangeService.round(netoCobrarFacturaVes + igtfVes, 2);
    const totalIngresoCajaUsd = BcvExchangeService.round(netoCobrarFacturaUsd + igtfUsd, 2);

    const targetAccount = STANDARD_ACCOUNTS.CAJA_CUSTODIA_DIVISAS;

    const lines: JournalEntryLineDto[] = [
      {
        accountCode: targetAccount.code,
        accountName: targetAccount.name,
        description: `Cobro Recibo N° ${receiptNumber} en divisas ($${totalIngresoCajaUsd}) incl. IGTF`,
        debitVes: totalIngresoCajaVes,
        creditVes: 0.0,
        debitUsd: totalIngresoCajaUsd,
        creditUsd: 0.0,
        bcvRate: bcvExchangeRate,
        thirdPartyRif: customerRif,
      },
      {
        accountCode: STANDARD_ACCOUNTS.RETENCIONES_IVA_COMPENSAR.code,
        accountName: STANDARD_ACCOUNTS.RETENCIONES_IVA_COMPENSAR.name,
        description: `Retención de IVA (75%) recibida según comprobante cliente SPE`,
        debitVes: ivaRetentionVes,
        creditVes: 0.0,
        debitUsd: ivaRetentionUsd,
        creditUsd: 0.0,
        bcvRate: bcvExchangeRate,
        thirdPartyRif: customerRif,
      },
      {
        accountCode: STANDARD_ACCOUNTS.CXC_COMERCIALES_NACIONALES.code,
        accountName: STANDARD_ACCOUNTS.CXC_COMERCIALES_NACIONALES.name,
        description: `Cancelación cuenta por cobrar cliente ${customerName}`,
        debitVes: 0.0,
        creditVes: totalInvoiceVes,
        debitUsd: 0.0,
        creditUsd: totalInvoiceUsd,
        bcvRate: bcvExchangeRate,
        thirdPartyRif: customerRif,
      },
      {
        accountCode: STANDARD_ACCOUNTS.IGTF_POR_PAGAR_ENTERAR_3.code,
        accountName: STANDARD_ACCOUNTS.IGTF_POR_PAGAR_ENTERAR_3.name,
        description: `IGTF 3% percibido en divisas por enterar al SENIAT`,
        debitVes: 0.0,
        creditVes: igtfVes,
        debitUsd: 0.0,
        creditUsd: igtfUsd,
        bcvRate: bcvExchangeRate,
        thirdPartyRif: customerRif,
      },
    ];

    AutomaticJournalGenerator.assertDoubleEntryBalance(lines);

    const year = parseInt(date.substring(0, 4), 10);
    const period = parseInt(date.substring(5, 7), 10);
    const totalDebitVes = BcvExchangeService.round(totalIngresoCajaVes + ivaRetentionVes, 2);
    const totalDebitUsd = BcvExchangeService.round(totalIngresoCajaUsd + ivaRetentionUsd, 2);

    return {
      tenantId,
      fiscalYear: year,
      fiscalPeriod: period,
      entryNumber,
      entryDate: date,
      concept: `Cobro en efectivo/divisas según Recibo N° ${receiptNumber} con Retención IVA e IGTF Percibido`,
      sourceModule: 'COBROS',
      sourceDocumentId: event.paymentId,
      status: 'ASENTADO',
      bcvExchangeRate,
      lines,
      totalDebitVes,
      totalCreditVes: totalDebitVes,
      totalDebitUsd,
      totalCreditUsd: totalDebitUsd,
    };
  }

  /**
   * Evento C: Compra a Proveedor con Retención de IVA (75%) y Retención de ISLR
   * DEBE: Cuenta de Gastos / Costo (Base Imponible)
   * DEBE: Crédito Fiscal IVA 16% (IVA Facturado)
   * HABER: Cuentas por Pagar Proveedores Nacionales (Monto Neto a Pagar)
   * HABER: IVA Retenido a Proveedores por Enterar (Retención IVA aplicada)
   * HABER: Retenciones de ISLR por Pagar (Retención ISLR practicada)
   */
  public generateSupplierPurchaseEntry(event: SupplierPurchaseEvent, entryNumber: number = 1): JournalEntryDto {
    const {
      tenantId,
      invoiceNumber,
      date,
      supplierRif,
      supplierName,
      expenseAccountCode,
      expenseDescription,
      bcvExchangeRate,
    } = event;

    const baseVes = BcvExchangeService.round(event.baseImponibleVes, 2);
    const baseUsd = BcvExchangeService.round(event.baseImponibleUsd, 2);

    const vatVes = BcvExchangeService.round(event.vatAmountVes, 2);
    const vatUsd = BcvExchangeService.round(event.vatAmountUsd, 2);

    const totalInvoiceVes = BcvExchangeService.round(baseVes + vatVes, 2);
    const totalInvoiceUsd = BcvExchangeService.round(baseUsd + vatUsd, 2);

    const ivaRetVes = BcvExchangeService.round(event.ivaRetentionVes, 2);
    const ivaRetUsd = BcvExchangeService.round(event.ivaRetentionUsd, 2);

    const islrRetVes = BcvExchangeService.round(event.islrRetentionVes, 2);
    const islrRetUsd = BcvExchangeService.round(event.islrRetentionUsd, 2);

    // Neto CxP a Proveedor = Total Factura - Retención IVA - Retención ISLR
    const netoPagarVes = BcvExchangeService.round(totalInvoiceVes - ivaRetVes - islrRetVes, 2);
    const netoPagarUsd = BcvExchangeService.round(totalInvoiceUsd - ivaRetUsd - islrRetUsd, 2);

    const lines: JournalEntryLineDto[] = [
      {
        accountCode: expenseAccountCode || STANDARD_ACCOUNTS.GASTOS_SERVICIOS_GENERALES.code,
        accountName: expenseDescription || STANDARD_ACCOUNTS.GASTOS_SERVICIOS_GENERALES.name,
        description: `Gasto/Compra Factura N° ${invoiceNumber} - ${supplierName}`,
        debitVes: baseVes,
        creditVes: 0.0,
        debitUsd: baseUsd,
        creditUsd: 0.0,
        bcvRate: bcvExchangeRate,
        thirdPartyRif: supplierRif,
      },
      {
        accountCode: STANDARD_ACCOUNTS.CREDITO_FISCAL_IVA_16.code,
        accountName: STANDARD_ACCOUNTS.CREDITO_FISCAL_IVA_16.name,
        description: `Crédito Fiscal IVA 16% Factura N° ${invoiceNumber}`,
        debitVes: vatVes,
        creditVes: 0.0,
        debitUsd: vatUsd,
        creditUsd: 0.0,
        bcvRate: bcvExchangeRate,
        thirdPartyRif: supplierRif,
      },
      {
        accountCode: STANDARD_ACCOUNTS.CXP_PROVEEDORES_NACIONALES.code,
        accountName: STANDARD_ACCOUNTS.CXP_PROVEEDORES_NACIONALES.name,
        description: `Neto por pagar Factura N° ${invoiceNumber}`,
        debitVes: 0.0,
        creditVes: netoPagarVes,
        debitUsd: 0.0,
        creditUsd: netoPagarUsd,
        bcvRate: bcvExchangeRate,
        thirdPartyRif: supplierRif,
      },
      {
        accountCode: STANDARD_ACCOUNTS.IVA_RETENIDO_PROVEEDORES_ENTERAR.code,
        accountName: STANDARD_ACCOUNTS.IVA_RETENIDO_PROVEEDORES_ENTERAR.name,
        description: `IVA Retenido a proveedor (75%/100%) por enterar`,
        debitVes: 0.0,
        creditVes: ivaRetVes,
        debitUsd: 0.0,
        creditUsd: ivaRetUsd,
        bcvRate: bcvExchangeRate,
        thirdPartyRif: supplierRif,
      },
      {
        accountCode: STANDARD_ACCOUNTS.RETENCIONES_ISLR_PAGAR.code,
        accountName: STANDARD_ACCOUNTS.RETENCIONES_ISLR_PAGAR.name,
        description: `Retención ISLR Concepto ${event.islrConceptCode || '057'} por pagar`,
        debitVes: 0.0,
        creditVes: islrRetVes,
        debitUsd: 0.0,
        creditUsd: islrRetUsd,
        bcvRate: bcvExchangeRate,
        thirdPartyRif: supplierRif,
      },
    ];

    AutomaticJournalGenerator.assertDoubleEntryBalance(lines);

    const year = parseInt(date.substring(0, 4), 10);
    const period = parseInt(date.substring(5, 7), 10);

    return {
      tenantId,
      fiscalYear: year,
      fiscalPeriod: period,
      entryNumber,
      entryDate: date,
      concept: `Compra a Proveedor ${supplierName} según Factura N° ${invoiceNumber} con Retenciones IVA e ISLR`,
      sourceModule: 'COMPRAS',
      sourceDocumentId: event.purchaseId,
      status: 'ASENTADO',
      bcvExchangeRate,
      lines,
      totalDebitVes: totalInvoiceVes,
      totalCreditVes: totalInvoiceVes,
      totalDebitUsd: totalInvoiceUsd,
      totalCreditUsd: totalInvoiceUsd,
    };
  }
}
