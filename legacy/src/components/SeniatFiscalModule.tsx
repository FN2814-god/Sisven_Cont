import React, { useState } from 'react';

export const SeniatFiscalModule: React.FC = () => {
  const [activeBook, setActiveBook] = useState<'sales' | 'purchases'>('sales');

  const salesData = [
    { op: 1, date: '2026-03-02', rif: 'J-30684267-5', client: 'MERCADOLIBRE VENEZUELA S.A.', invoice: '000101', control: '00-00101', base: 36500.0, vat: 5840.0, vatRet: 4380.0, igtf: 1095.0, total: 43435.0 },
    { op: 2, date: '2026-03-05', rif: 'J-00006372-9', client: 'CERVECERIA POLAR C.A.', invoice: '000102', control: '00-00102', base: 73000.0, vat: 11680.0, vatRet: 8760.0, igtf: 0.0, total: 84680.0 },
    { op: 3, date: '2026-03-10', rif: 'V-12345678-1', client: 'JUAN PEREZ (CLIENTE CONTADO)', invoice: '000103', control: '00-00103', base: 18250.0, vat: 2920.0, vatRet: 0.0, igtf: 547.5, total: 21717.5 },
  ];

  const purchasesData = [
    { op: 1, date: '2026-03-04', rif: 'J-00006372-9', supplier: 'EMPRESAS POLAR C.A.', invoice: '99812', control: '00-8812', base: 50000.0, vat: 8000.0, vatRet: 6000.0, islrRet: 1000.0, net: 51000.0 },
    { op: 2, date: '2026-03-08', rif: 'J-31122334-9', supplier: 'MANTENIMIENTO INDUSTRIAL C.A.', invoice: '1120', control: '00-0112', base: 20000.0, vat: 3200.0, vatRet: 2400.0, islrRet: 400.0, net: 20400.0 },
  ];

  const handleExportTxt = () => {
    const records = [
      ['J300123450', '202603', '2026-03-04', 'C', '01', 'J000063729', '00099812', '00-008812', '58000.00', '50000.00', '6000.00', '0', '20260300000001', '0.00', '16.00', '0'],
      ['J300123450', '202603', '2026-03-08', 'C', '01', 'J311223349', '00001120', '00-000112', '23200.00', '20000.00', '2400.00', '0', '20260300000002', '0.00', '16.00', '0'],
    ];
    const txtContent = records.map((r) => r.join('\t')).join('\r\n');
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Retenciones_IVA_SENIAT_202603.txt';
    link.click();
  };

  const handleExportXml = () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<RelacionRetencionesISLR RifAgente="J300123450" Periodo="202603">
  <DetalleRetencion>
    <RifRetenido>J000063729</RifRetenido>
    <NumeroFactura>00099812</NumeroFactura>
    <NumeroControl>00-008812</NumeroControl>
    <FechaOperacion>04/03/2026</FechaOperacion>
    <CodigoConcepto>057</CodigoConcepto>
    <MontoOperacion>50000.00</MontoOperacion>
    <PorcentajeRetencion>2.00</PorcentajeRetencion>
    <MontoSustraendo>0.00</MontoSustraendo>
    <MontoRetenido>1000.00</MontoRetenido>
  </DetalleRetencion>
</RelacionRetencionesISLR>`;
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Retenciones_ISLR_SENIAT_202603.xml';
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Barra de Acciones Fiscales */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Generador de Archivos de Declaración SENIAT</h3>
          <p className="text-xs text-slate-500">Providencias SNAT/2025/000054 & Decreto 1808</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleExportTxt}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center space-x-1.5"
          >
            <span>Exportar TXT Retenciones IVA (16 Campos)</span>
          </button>
          <button
            onClick={handleExportXml}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center space-x-1.5"
          >
            <span>Exportar XML ISLR (XSD SENIAT)</span>
          </button>
        </div>
      </div>

      {/* Libros Fiscales */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 pt-4 flex space-x-6">
          <button
            onClick={() => setActiveBook('sales')}
            className={`pb-3 text-sm font-bold border-b-2 ${
              activeBook === 'sales' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            Libro de Ventas Fiscal (PA SNAT/2011/00071 & PA SNAT/2026/00093)
          </button>
          <button
            onClick={() => setActiveBook('purchases')}
            className={`pb-3 text-sm font-bold border-b-2 ${
              activeBook === 'purchases' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            Libro de Compras Fiscal (Soporte Crédito Fiscal)
          </button>
        </div>

        <div className="p-4 overflow-x-auto">
          {activeBook === 'sales' ? (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Op. #</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">RIF Comprador</th>
                  <th className="py-2.5 px-3 font-sans">Razón Social</th>
                  <th className="py-2.5 px-3">Factura</th>
                  <th className="py-2.5 px-3">N° Control</th>
                  <th className="py-2.5 px-3 text-right">Base 16%</th>
                  <th className="py-2.5 px-3 text-right">Débito 16%</th>
                  <th className="py-2.5 px-3 text-right">IVA Retenido</th>
                  <th className="py-2.5 px-3 text-right">IGTF 3%</th>
                  <th className="py-2.5 px-3 text-right">Total (Bs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {salesData.map((s) => (
                  <tr key={s.op} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold">{s.op}</td>
                    <td className="py-2 px-3">{s.date}</td>
                    <td className="py-2 px-3 font-semibold text-blue-700">{s.rif}</td>
                    <td className="py-2 px-3 font-sans truncate max-w-[180px]">{s.client}</td>
                    <td className="py-2 px-3 font-bold">{s.invoice}</td>
                    <td className="py-2 px-3 text-slate-500">{s.control}</td>
                    <td className="py-2 px-3 text-right">{s.base.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right text-emerald-700">{s.vat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right text-amber-700">{s.vatRet.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right text-indigo-700">{s.igtf.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right font-bold">{s.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Op. #</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">RIF Proveedor</th>
                  <th className="py-2.5 px-3 font-sans">Razón Social</th>
                  <th className="py-2.5 px-3">Factura</th>
                  <th className="py-2.5 px-3">N° Control</th>
                  <th className="py-2.5 px-3 text-right">Base Imponible</th>
                  <th className="py-2.5 px-3 text-right">Crédito Fiscal</th>
                  <th className="py-2.5 px-3 text-right">IVA Retenido</th>
                  <th className="py-2.5 px-3 text-right">ISLR Retenido</th>
                  <th className="py-2.5 px-3 text-right">Neto Pagado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {purchasesData.map((p) => (
                  <tr key={p.op} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold">{p.op}</td>
                    <td className="py-2 px-3">{p.date}</td>
                    <td className="py-2 px-3 font-semibold text-blue-700">{p.rif}</td>
                    <td className="py-2 px-3 font-sans truncate max-w-[180px]">{p.supplier}</td>
                    <td className="py-2 px-3 font-bold">{p.invoice}</td>
                    <td className="py-2 px-3 text-slate-500">{p.control}</td>
                    <td className="py-2 px-3 text-right">{p.base.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right text-emerald-700">{p.vat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right text-amber-700 font-bold">{p.vatRet.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right text-indigo-700">{p.islrRet.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right font-bold">{p.net.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
