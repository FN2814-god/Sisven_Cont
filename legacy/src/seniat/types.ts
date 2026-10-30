/**
 * Tipos de datos para el Motor Tributario SENIAT y Facturación Venezolana
 */

export type RifPrefix = 'V' | 'E' | 'J' | 'P' | 'G' | 'C';

export type FiscalDocumentType = 
  | '01' // Factura
  | '02' // Nota de Débito
  | '03' // Nota de Crédito
  | '04' // Certificado Exportación
  | '05'; // Liquidación Aduanera

export type FiscalPersonType = 'PNR' | 'PNNR' | 'PJ_DOM' | 'PJ_NODOM';

export interface BuyerTaxProfile {
  rif: string;
  razonSocial: string;
  isSpecialTaxpayer: boolean; // Sujeto Pasivo Especial (SPE)
  defaultIvaRetentionRate?: number; // 75.00 | 100.00
}

export interface SupplierTaxProfile {
  rif: string;
  razonSocial: string;
  isRifValid: boolean;
  isRifActiveInSeniat: boolean;
  forced100PercentRetention?: boolean;
}

export interface InvoiceItemDetail {
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  aliquotType: 'G' | 'R' | 'A' | 'E'; // General (16%), Reducida (8%), Adicional (31%), Exenta (0%)
  vatPercentage: number;
  vatAmount: number;
  totalRow: number;
}

export interface InvoiceTaxEvaluationInput {
  invoiceNumber: string;
  controlNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  affectedInvoiceNumber?: string;
  documentType: FiscalDocumentType;
  isContingencyInvoice: boolean;
  hasAuthorizedControlNumber: boolean;
  isVatDiscriminated: boolean;
  buyer: BuyerTaxProfile;
  supplier: SupplierTaxProfile;
  baseImponible16: number;
  baseImponible8: number;
  baseImponible31: number;
  montoExento: number;
  debitoFiscal16: number;
  debitoFiscal8: number;
  debitoFiscal31: number;
  totalInvoiceWithVat: number;
  bcvExchangeRate: number;
}

export interface IvaRetentionResult {
  isSubjectToRetention: boolean;
  retentionPercentage: number; // 0, 75 o 100
  baseImponibleTotal: number;
  debitoFiscalTotal: number;
  montoIvaRetenido: number;
  montoIvaRetenidoUsd: number;
  appliedReason: string;
}

export interface IvaTxtRecord {
  rifAgente: string; // 10 chars sin guiones (ej. J123456789)
  periodoImpositivo: string; // AAAAMM
  fechaFactura: string; // AAAA-MM-DD
  tipoOperacion: 'C'; // Siempre 'C' para compras
  tipoDocumento: FiscalDocumentType; // '01', '02', '03'
  rifProveedor: string; // 10 chars sin guiones
  numeroFactura: string;
  numeroControl: string;
  montoTotalConIva: number;
  baseImponible: number;
  montoIvaRetenido: number;
  numeroFacturaAfectada: string; // '0' si no aplica
  numeroComprobante: string; // 14 dígitos (AAAAMM + 8 correlativos)
  montoExento: number;
  alicuotaAplicada: number; // 16.00, 8.00, 31.00
  numeroExpedienteImportacion: string; // '0' si es nacional
}

export interface IslrConceptMatrix {
  code: string;
  description: string;
  beneficiaryType: FiscalPersonType;
  basePercentage: number;
  taxRatePercentage: number;
  appliesSustraendo: boolean;
}

export interface IslrCalculationInput {
  conceptCode: string;
  amount: number; // Monto facturado
  currentUtValue: number; // Valor actual de la Unidad Tributaria en VES
  beneficiaryType: FiscalPersonType;
}

export interface IslrCalculationResult {
  conceptCode: string;
  operationAmount: number;
  baseImponible: number;
  taxRatePercentage: number;
  grossTax: number;
  sustraendo: number;
  netTaxRetained: number;
  isExemptByMinimumThreshold: boolean;
}

export interface IslrXmlDetailNode {
  rifRetenido: string; // 10 chars
  numeroFactura: string;
  numeroControl: string;
  fechaOperacion: string; // DD/MM/AAAA
  codigoConcepto: string; // 3 dígitos (ej. '057')
  montoOperacion: number;
  porcentajeRetencion: number;
  montoSustraendo: number;
  montoRetenido: number;
}
