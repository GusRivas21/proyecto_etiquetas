import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';

type LabelRecord = {
    id: number; code: string; name: string; credit_amount: string | null; due_date: string | null;
    npe: string | null; installment_amount: string | null; terms: string | null;
    qr_code: string | null; barcode: string | null;
};
type Filters = { search: string; from: string; to: string };

function chunk<T>(items: T[], size: number): T[][] {
    const pages: T[][] = [];
    for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
    return pages;
}

function money(value: string | null) {
    if (!value) return '—';
    return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(value));
}

function PrintSheet({ records, columns, rows }: { records: LabelRecord[]; columns: number; rows: number }) {
    if (typeof document === 'undefined') return null;
    return createPortal(<div className="print-sheet">
        <style>{`
            @media screen { .print-sheet { display:none } }
            @media print {
                @page { size: letter portrait; margin: .28in }
                html, body { margin:0!important; padding:0!important; background:#fff!important }
                body > *:not(.print-sheet) { display:none!important }
                .print-sheet { display:block!important; color:#000; font-family:Arial,Helvetica,sans-serif }
                .print-page { width:7.94in; height:10.44in; display:grid; gap:.06in; break-after:page; page-break-after:always }
                .print-page:last-child { break-after:auto; page-break-after:auto }

                .print-label {
                    box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between;
                    gap:.03in; padding:.06in .09in; border:1px dashed #999; overflow:hidden; break-inside:avoid; min-height:0;
                }
                .print-label > * { flex:none; min-width:0 }

                .print-codeline, .print-npe { display:flex; align-items:center; gap:.06in; font-size:8pt; height:.18in }
                .print-box { flex:1; box-sizing:border-box; height:.18in; line-height:.16in; border:1px solid #000; padding:0 .05in; font-size:8pt; overflow:hidden; white-space:nowrap; text-overflow:ellipsis }
                .print-npe b { font-size:9pt }

                .print-barcode { display:block; width:100%; height:.3in; object-fit:fill }

                /* Fila central: altura FIJA para que nada se monte sobre otra fila */
                .print-main { display:grid; grid-template-columns:.8in 1fr .72in; gap:.08in; height:.74in; overflow:hidden }
                .print-brand { box-sizing:border-box; height:.74in; border:1px solid #888; background:#e5e5e5; display:flex; align-items:center; justify-content:center; font-size:7pt; color:#666; text-align:center; overflow:hidden }
                .print-brand img { max-width:100%; max-height:100%; object-fit:contain }
                .print-copy { min-width:0; display:flex; flex-direction:column; gap:.025in; overflow:hidden }
                .print-name { font-size:11pt; font-weight:bold; font-style:italic; line-height:1.1; border-bottom:1px solid #000; padding-bottom:.01in; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
                .print-field { border:1px solid #000; padding:0 .05in; font-size:8pt; line-height:.2in; height:.2in; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
                .print-qr { width:.72in; height:.72in; object-fit:contain; display:block }

                .print-string { box-sizing:border-box; height:.17in; line-height:.15in; border:1px solid #000; padding:0 .05in; font-size:7pt; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
                .print-terms { box-sizing:border-box; border:1px solid #000; padding:.01in .05in; font-size:5.5pt; line-height:1.15; height:.27in; overflow:hidden }
            }
        `}</style>
        {chunk(records, columns * rows).map((page, index) => <div key={index} className="print-page" style={{ gridTemplateColumns: `repeat(${columns},1fr)`, gridTemplateRows: `repeat(${rows},1fr)` }}>
            {page.map(record => <article key={record.id} className="print-label">
                <div className="print-codeline"><span>Código:</span><span className="print-box">{record.code}</span></div>
                {record.barcode && <img className="print-barcode" src={record.barcode} alt={`Código de barras ${record.code}`} />}

                <div className="print-main">
                    <div className="print-brand">Logo / imagen</div>
                    <div className="print-copy">
                        <div className="print-name">{record.name}</div>
                        <div className="print-field"><b>Monto del crédito:</b> {money(record.credit_amount)}</div>
                        <div className="print-field"><b>Fecha de pago:</b> {record.due_date?.slice(0, 10) || '—'}</div>
                    </div>
                    {record.qr_code ? <img className="print-qr" src={record.qr_code} alt={`QR ${record.code}`} /> : <div />}
                </div>

                <div className="print-npe"><b>NPE:</b><span className="print-box">{record.npe || '—'}</span></div>
                {record.barcode && <img className="print-barcode" src={record.barcode} alt={`Código de barras ${record.code}`} />}
                <div className="print-string">{record.code}</div>

                <div className="print-terms">{record.terms || 'El uso de esta tarjeta queda sujeto a las condiciones establecidas en el contrato.'}</div>
            </article>)}
        </div>)}
    </div>, document.body);
}

export default function LabelsIndex({ records, filters }: { records: LabelRecord[]; filters: Filters }) {
    const [selected, setSelected] = useState<number[]>([]);
    const [query, setQuery] = useState(filters);
    const [printIds, setPrintIds] = useState<number[]>([]);
    const [columns, setColumns] = useState(2);
    const [rows, setRows] = useState(4);
    const form = useForm({ code: '', name: '', credit_amount: '', due_date: '', npe: '', installment_amount: '', terms: '' });
    const selectedRecords = records.filter(record => printIds.includes(record.id));

    useEffect(() => {
        const cleanup = () => setPrintIds([]);
        window.addEventListener('afterprint', cleanup);
        return () => window.removeEventListener('afterprint', cleanup);
    }, []);

    function submitRecord(event: FormEvent) {
        event.preventDefault();
        form.post('/labels', { onSuccess: () => form.reset('code', 'name', 'credit_amount', 'npe', 'installment_amount', 'terms') });
    }
    function search(event: FormEvent) {
        event.preventDefault();
        router.get('/labels', query, { preserveState: true, preserveScroll: true });
    }
    function printRecords(ids: number[]) {
        flushSync(() => setPrintIds(ids));
        window.setTimeout(() => window.print(), 100);
    }
    const set = (key: keyof typeof form.data, value: string) => form.setData(key, value);
    const inputClass = 'mt-1 w-full rounded border px-3 py-2';

    return <AppLayout breadcrumbs={[{ title: 'Etiquetas', href: '/labels' }]}>
        <Head title="Etiquetas de crédito" />
        <main className="space-y-6 p-4 md:p-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div><h1 className="text-2xl font-semibold">Etiquetas de crédito</h1><p className="text-muted-foreground mt-1 text-sm">Registra créditos, consulta los pagos e imprime etiquetas con QR y código de barras.</p></div>
                <div className="flex flex-wrap items-end gap-2">
                    <label className="text-xs">Columnas<input type="number" min={1} max={3} className="mt-1 block w-16 rounded border px-2 py-2 text-sm" value={columns} onChange={e => setColumns(Math.min(3, Math.max(1, Number(e.target.value) || 1)))} /></label>
                    <label className="text-xs">Filas<input type="number" min={1} max={8} className="mt-1 block w-16 rounded border px-2 py-2 text-sm" value={rows} onChange={e => setRows(Math.min(8, Math.max(1, Number(e.target.value) || 1)))} /></label>
                    <button className="rounded border px-3 py-2 text-sm disabled:opacity-50" disabled={!selected.length} onClick={() => printRecords(selected)}>Imprimir seleccionadas ({selected.length})</button>
                    <button className="rounded border px-3 py-2 text-sm disabled:opacity-50" disabled={!records.length} onClick={() => printRecords(records.map(r => r.id))}>Imprimir lista</button>
                    <button className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50" disabled={!records.length} onClick={() => { if (window.confirm('¿Eliminar todos los registros de tu lista?')) router.delete('/labels'); }}>Eliminar lista</button>
                </div>
            </header>

            <section className="rounded-lg border p-4">
                <h2 className="mb-3 font-medium">Nuevo registro de crédito</h2>
                <form onSubmit={submitRecord} className="grid gap-3 md:grid-cols-3">
                    <label className="text-sm">Código de etiqueta<input required className={inputClass} value={form.data.code} onChange={e => set('code', e.target.value)} /><span className="text-muted-foreground mt-1 block text-xs">Se usa para generar el QR y el código de barras.</span></label>
                    <label className="text-sm">Nombre del cliente<input required className={inputClass} value={form.data.name} onChange={e => set('name', e.target.value)} /></label>
                    <label className="text-sm">Monto del crédito (USD)<input type="number" min="0" step="0.01" className={inputClass} value={form.data.credit_amount} onChange={e => set('credit_amount', e.target.value)} /></label>
                    <label className="text-sm">Fecha de pago<input type="date" className={inputClass} value={form.data.due_date} onChange={e => set('due_date', e.target.value)} /></label>
                    <label className="text-sm">NPE<input className={inputClass} value={form.data.npe} onChange={e => set('npe', e.target.value)} /></label>
                    <label className="text-sm">Monto de cuota (USD)<input type="number" min="0" step="0.01" className={inputClass} value={form.data.installment_amount} onChange={e => set('installment_amount', e.target.value)} /></label>
                    <label className="text-sm md:col-span-3">Aviso o condiciones<textarea rows={2} className={inputClass} value={form.data.terms} onChange={e => set('terms', e.target.value)} /></label>
                    <div className="md:col-span-3"><button type="submit" disabled={form.processing} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm">Guardar etiqueta</button>{Object.entries(form.errors).map(([key, error]) => <p key={key} className="mt-1 text-sm text-red-600">{error}</p>)}</div>
                </form>
            </section>

            <form onSubmit={search} className="grid items-end gap-3 rounded-lg border p-4 md:grid-cols-4">
                <label className="text-sm">Buscar<input className={inputClass} placeholder="Código, cliente, NPE o condiciones" value={query.search} onChange={e => setQuery({ ...query, search: e.target.value })} /></label>
                <label className="text-sm">Pago desde<input type="date" className={inputClass} value={query.from} onChange={e => setQuery({ ...query, from: e.target.value })} /></label>
                <label className="text-sm">Pago hasta<input type="date" className={inputClass} value={query.to} onChange={e => setQuery({ ...query, to: e.target.value })} /></label>
                <div className="flex gap-2"><button className="rounded border px-4 py-2 text-sm">Buscar</button><button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => { setQuery({ search: '', from: '', to: '' }); router.get('/labels'); }}>Limpiar</button></div>
            </form>

            <section className="overflow-x-auto rounded-lg border">
                <div className="text-muted-foreground border-b px-4 py-3 text-sm">{records.length} registro(s)</div>
                <table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-muted/50"><tr>
                    <th className="p-3"><input aria-label="Seleccionar todos" type="checkbox" checked={records.length > 0 && selected.length === records.length} onChange={e => setSelected(e.target.checked ? records.map(r => r.id) : [])} /></th>
                    <th className="p-3">Código</th><th className="p-3">Cliente</th><th className="p-3">Crédito</th><th className="p-3">Cuota</th><th className="p-3">Fecha de pago</th><th className="p-3">NPE</th><th className="p-3">Acciones</th>
                </tr></thead><tbody>{records.map(record => <tr key={record.id} className="border-t">
                    <td className="p-3"><input aria-label={`Seleccionar ${record.name}`} type="checkbox" checked={selected.includes(record.id)} onChange={e => setSelected(e.target.checked ? [...selected, record.id] : selected.filter(id => id !== record.id))} /></td>
                    <td className="p-3">{record.code}</td><td className="p-3 font-medium">{record.name}</td><td className="p-3">{money(record.credit_amount)}</td><td className="p-3">{money(record.installment_amount)}</td><td className="p-3">{record.due_date?.slice(0, 10) || '—'}</td><td className="p-3">{record.npe || '—'}</td>
                    <td className="p-3"><button className="underline" onClick={() => printRecords([record.id])}>Imprimir</button><button className="ml-3 text-red-700 underline" onClick={() => { if (window.confirm('¿Eliminar este registro?')) router.delete(`/labels/${record.id}`); }}>Eliminar</button></td>
                </tr>)}</tbody></table>
                {!records.length && <p className="text-muted-foreground p-6 text-center text-sm">No hay registros que coincidan. Agrega uno arriba.</p>}
            </section>
        </main>
        <PrintSheet records={selectedRecords} columns={columns} rows={rows} />
    </AppLayout>;
}
