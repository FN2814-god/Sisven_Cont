import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxRetentionIva, TaxRetentionIslr } from '../../entities/fiscal.entity';
import { SeniatFileGenerator } from '../../shared/seniat/seniat-file-generator';
import { RifValidator } from '../../shared/seniat/rif-validator';
import { IvaTxtRecord, IslrXmlDetailNode, FiscalDocumentType } from '../../shared/seniat/types';

const PERIOD_RE = /^\d{6}$/;

@Injectable()
export class RetentionsService {
  constructor(
    @InjectRepository(TaxRetentionIva) private readonly iva: Repository<TaxRetentionIva>,
    @InjectRepository(TaxRetentionIslr) private readonly islr: Repository<TaxRetentionIslr>,
  ) {}

  listIva(tenantId: string, periodo?: string) {
    const where: any = { tenant_id: tenantId };
    if (periodo) where.periodo_impositivo = periodo;
    return this.iva.find({ where, order: { fecha_factura: 'DESC' } });
  }

  listIslr(tenantId: string, periodo?: string) {
    const where: any = { tenant_id: tenantId };
    if (periodo) where.periodo_anomes = periodo;
    return this.islr.find({ where, order: { fecha_operacion: 'DESC' } });
  }

  /** Archivo TXT oficial de retenciones de IVA (16 campos, tabulado) */
  async generateVatTxt(tenantId: string, periodo: string) {
    if (!PERIOD_RE.test(periodo)) {
      throw new BadRequestException('El período debe tener formato AAAAMM');
    }
    const rows = await this.iva.find({
      where: { tenant_id: tenantId, periodo_impositivo: periodo },
      order: { numero_comprobante: 'ASC' },
    });
    const records: IvaTxtRecord[] = rows.map((r) => ({
      rifAgente: r.rif_agente,
      periodoImpositivo: r.periodo_impositivo,
      fechaFactura: r.fecha_factura,
      tipoOperacion: 'C',
      tipoDocumento: r.tipo_documento as FiscalDocumentType,
      rifProveedor: r.rif_retenido,
      numeroFactura: r.numero_factura,
      numeroControl: r.numero_control,
      montoTotalConIva: r.monto_total_con_iva,
      baseImponible: r.base_imponible,
      montoIvaRetenido: r.monto_iva_retenido,
      numeroFacturaAfectada: r.numero_factura_afectada,
      numeroComprobante: r.numero_comprobante,
      montoExento: r.monto_exento,
      alicuotaAplicada: r.alicuota_aplicada,
      numeroExpedienteImportacion: r.numero_expediente,
    }));
    return { filename: `retenciones_iva_${periodo}.txt`, content: SeniatFileGenerator.generateVatTxt(records) };
  }

  /** Archivo XML oficial de retenciones de ISLR */
  async generateIslrXml(tenantId: string, periodo: string) {
    if (!PERIOD_RE.test(periodo)) {
      throw new BadRequestException('El período debe tener formato AAAAMM');
    }
    const rows = await this.islr.find({
      where: { tenant_id: tenantId, periodo_anomes: periodo },
      order: { fecha_operacion: 'ASC' },
    });
    if (!rows.length) throw new BadRequestException('No hay retenciones de ISLR en el período');
    const fmt = (d: string) => `${d.substring(8, 10)}/${d.substring(5, 7)}/${d.substring(0, 4)}`;
    const detalles: IslrXmlDetailNode[] = rows.map((r) => ({
      rifRetenido: r.rif_retenido,
      numeroFactura: r.numero_factura,
      numeroControl: r.numero_control,
      fechaOperacion: fmt(r.fecha_operacion),
      codigoConcepto: r.codigo_concepto,
      montoOperacion: r.monto_operacion,
      porcentajeRetencion: r.porcentaje_retencion,
      montoSustraendo: r.monto_sustraendo,
      montoRetenido: r.monto_retenido,
    }));
    const rifAgente = RifValidator.clean(rows[0].rif_agente);
    return {
      filename: `retenciones_islr_${periodo}.xml`,
      content: SeniatFileGenerator.generateIslrXml(rifAgente, periodo, detalles),
    };
  }
}
