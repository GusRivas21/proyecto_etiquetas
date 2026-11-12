import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';

type LabelRecord = { id: number; code: string | null; qr_code: string | null; name: string; description: string | null; label_date: string };
type Filters = { search: string; from: string; to: string };

function localDate() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function chunk<T>(items: T[], size: number): T[][] {
    const pages: T[][] = [];
    for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
    return pages;
}

/**
 * Hoja de impresión: se renderiza fuera de #app (portal al <body>),
 * está oculta en pantalla y es lo único visible al imprimir.
 * Cada página es tamaño carta (8.5in x 11in) con una cuadrícula de columnas x filas.
 */
function PrintSheet({ records, columns, rows }: { records: LabelRecord[]; columns: number; rows: number }) {
    if (typeof document === 'undefined') return null;
    const pages = chunk(records, columns * rows);

    return createPortal(
        <div className="print-sheet">
            <style>{`
                @media screen { .print-sheet { display: none; } }
                @media print {
                    @page { size: letter portrait; margin: 0; }
                    html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
                    body > *:not(.print-sheet) { display: none !important; }
                    .print-sheet { display: block !important; visibility: visible !important; color: #000; background: #fff; }
                    .print-sheet * { visibility: visible !important; }
                    .print-page {
                        box-sizing: border-box;
                        width: 8.5in;
                        height: 10.95in;
                        padding: 0.5in;
                        display: grid;
                        break-after: page;
                        page-break-after: always;
                    }
                    .print-page:last-child { break-after: auto; page-break-after: auto; }
                    .print-label {
                        box-sizing: border-box;
                        display: flex;
                        align-items: center;
                        gap: 0.1in;
                        padding: 0.08in;
                        overflow: hidden;
                        border: 1px dashed #bbb; /* guía de corte */
                        break-inside: avoid;
                    }
                    .print-label img { height: 0.95in; width: 0.95in; flex-shrink: 0; }
                    .print-label .txt { min-width: 0; line-height: 1.2; }
                    .print-label .name { font-size: 11pt; font-weight: 700; }
                    .print-label .code { font-size: 9pt; }
                    .print-label .desc {
                        font-size: 8pt; color: #333;
                        display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
                    }
                    .print-label .date { font-size: 8pt; color: #555; margin-top: 2px; }
                }
            `}</style>

            {pages.map((page, i) => (
                <div
                    key={i}
                    className="print-page"
                    style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
                >
                    {page.map((record) => (
                        <div key={record.id} className="print-label">
                            {record.qr_code && <img src={record.qr_code} alt={`QR ${record.code ?? ''}`} />}
                            <div className="txt">
                                <div className="name">{record.name}</div>
                                {/* {record.code && <div className="code">{record.code}</div>} */}
                                {record.description && <div className="desc">{record.description}</div>}
                                <div className="date">{record.label_date.slice(0, 10)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>,
        document.body,
    );
}

export default function LabelsIndex({ records, filters }: { records: LabelRecord[]; filters: Filters }) {
    const [selected, setSelected] = useState<number[]>([]);
    const [query, setQuery] = useState(filters);
    const [printIds, setPrintIds] = useState<number[]>([]);
    const [columns, setColumns] = useState(3);
    const [rows, setRows] = useState(5);
    const form = useForm({ code: '', name: '', description: '', label_date: localDate() });

    const printRecordsList = records.filter((record) => printIds.includes(record.id));

    useEffect(() => {
        const cleanup = () => setPrintIds([]);
        window.addEventListener('afterprint', cleanup);
        return () => window.removeEventListener('afterprint', cleanup);
    }, []);

    function submitRecord(event: FormEvent) {
        event.preventDefault();
        form.post('/labels', { onSuccess: () => form.reset('code', 'name', 'description') });
    }

    function search(event: FormEvent) {
        event.preventDefault();
        router.get('/labels', query, { preserveState: true, preserveScroll: true });
    }

    function printRecords(ids: number[]) {
        // Renderiza la hoja de impresión y luego abre el diálogo de impresión
        flushSync(() => setPrintIds(ids));
        window.setTimeout(() => window.print(), 100);
    }

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value || min));

    return (
        <AppLayout breadcrumbs={[{ title: 'Etiquetas', href: '/labels' }]}>
            <Head title="Lista de etiquetas" />
            <main className="space-y-6 p-4 md:p-6">
                <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Lista de etiquetas</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Agrega registros, busca por texto o fecha y prepara su impresión.</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                        <label className="text-xs">
                            Columnas
                            <input
                                type="number"
                                min={1}
                                max={3}
                                className="mt-1 block w-16 rounded border px-2 py-2 text-sm"
                                value={columns}
                                onChange={(e) => setColumns(clamp(Number(e.target.value), 1, 6))}
                            />
                        </label>
                        <label className="text-xs">
                            Filas
                            <input
                                type="number"
                                min={1}
                                max={10}
                                className="mt-1 block w-16 rounded border px-2 py-2 text-sm"
                                value={rows}
                                onChange={(e) => setRows(clamp(Number(e.target.value), 1, 10))}
                            />
                        </label>
                        <button
                            className="rounded border px-3 py-2 text-sm disabled:opacity-50"
                            disabled={selected.length === 0}
                            onClick={() => printRecords(selected)}
                        >
                            Imprimir seleccionadas ({selected.length})
                        </button>
                        <button
                            className="rounded border px-3 py-2 text-sm"
                            onClick={() => printRecords(records.map((record) => record.id))}
                            disabled={!records.length}
                        >
                            Imprimir lista
                        </button>
                        <button
                            className="rounded border border-red-300 px-3 py-2 text-sm text-red-700"
                            disabled={!records.length}
                            onClick={() => {
                                if (window.confirm('¿Eliminar todos los registros de tu lista?')) router.delete('/labels');
                            }}
                        >
                            Eliminar lista
                        </button>
                    </div>
                </header>

                <section className="rounded-lg border p-4">
                    <h2 className="mb-3 font-medium">Agregar registro</h2>
                    <form onSubmit={submitRecord} className="grid gap-3 md:grid-cols-4">
                        <label className="text-sm">
                            Código
                            <input
                                className="mt-1 w-full rounded border px-3 py-2"
                                value={form.data.code}
                                onChange={(e) => form.setData('code', e.target.value)}
                            />
                            <span className="text-muted-foreground mt-1 block text-xs">El QR se genera con este mismo código.</span>
                        </label>
                        <label className="text-sm">
                            Nombre
                            <input
                                required
                                className="mt-1 w-full rounded border px-3 py-2"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                            />
                        </label>
                        <label className="text-sm">
                            Descripción
                            <input
                                className="mt-1 w-full rounded border px-3 py-2"
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                            />
                        </label>
                        <label className="text-sm">
                            Fecha
                            <input
                                required
                                type="date"
                                className="mt-1 w-full rounded border px-3 py-2"
                                value={form.data.label_date}
                                onChange={(e) => form.setData('label_date', e.target.value)}
                            />
                        </label>
                        <div className="md:col-span-4">
                            <button type="submit" disabled={form.processing} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm">
                                Agregar a la lista
                            </button>
                            {form.errors.name && <p className="mt-1 text-sm text-red-600">{form.errors.name}</p>}
                        </div>
                    </form>
                </section>

                <form onSubmit={search} className="grid items-end gap-3 rounded-lg border p-4 md:grid-cols-4">
                    <label className="text-sm">
                        Buscar
                        <input
                            className="mt-1 w-full rounded border px-3 py-2"
                            placeholder="Código, nombre o descripción"
                            value={query.search}
                            onChange={(e) => setQuery({ ...query, search: e.target.value })}
                        />
                    </label>
                    <label className="text-sm">
                        Desde
                        <input
                            type="date"
                            className="mt-1 w-full rounded border px-3 py-2"
                            value={query.from}
                            onChange={(e) => setQuery({ ...query, from: e.target.value })}
                        />
                    </label>
                    <label className="text-sm">
                        Hasta
                        <input
                            type="date"
                            className="mt-1 w-full rounded border px-3 py-2"
                            value={query.to}
                            onChange={(e) => setQuery({ ...query, to: e.target.value })}
                        />
                    </label>
                    <div className="flex gap-2">
                        <button type="submit" className="rounded border px-4 py-2 text-sm">
                            Buscar
                        </button>
                        <button
                            type="button"
                            className="rounded border px-4 py-2 text-sm"
                            onClick={() => {
                                setQuery({ search: '', from: '', to: '' });
                                router.get('/labels');
                            }}
                        >
                            Limpiar
                        </button>
                    </div>
                    {form.errors.label_date && <p className="text-sm text-red-600">{form.errors.label_date}</p>}
                </form>

                <section className="overflow-x-auto rounded-lg border">
                    <div className="text-muted-foreground border-b px-4 py-3 text-sm">{records.length} registro(s)</div>
                    <table className="w-full min-w-[700px] text-left text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="p-3">
                                    <input
                                        aria-label="Seleccionar todos"
                                        type="checkbox"
                                        checked={records.length > 0 && selected.length === records.length}
                                        onChange={(e) => setSelected(e.target.checked ? records.map((r) => r.id) : [])}
                                    />
                                </th>
                                <th className="p-3">Código</th>
                                {/* <th className="p-3">QR</th> */}
                                <th className="p-3">Nombre</th>
                                <th className="p-3">Descripción</th>
                                <th className="p-3">Fecha</th>
                                <th className="p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((record) => (
                                <tr key={record.id} className="border-t">
                                    <td className="p-3">
                                        <input
                                            aria-label={`Seleccionar ${record.name}`}
                                            type="checkbox"
                                            checked={selected.includes(record.id)}
                                            onChange={(e) =>
                                                setSelected(e.target.checked ? [...selected, record.id] : selected.filter((id) => id !== record.id))
                                            }
                                        />
                                    </td>
                                    <td className="p-3">{record.code || '—'}</td>
                                    {/* <td className="p-3">
                                        {record.qr_code ? (
                                            <img className="h-20 w-20" src={record.qr_code} alt={`Código QR para ${record.code}`} />
                                        ) : (
                                            <span className="text-muted-foreground">Sin código</span>
                                        )}
                                    </td> */}
                                    <td className="p-3 font-medium">{record.name}</td>
                                    <td className="p-3">{record.description || '—'}</td>
                                    <td className="p-3">{record.label_date.slice(0, 10)}</td>
                                    <td className="p-3">
                                        <div className="flex gap-2">
                                            <button className="underline" onClick={() => printRecords([record.id])}>
                                                Imprimir
                                            </button>
                                            <button
                                                className="text-red-700 underline"
                                                onClick={() => {
                                                    if (window.confirm('¿Eliminar este registro?')) router.delete(`/labels/${record.id}`);
                                                }}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {records.length === 0 && (
                        <p className="text-muted-foreground p-6 text-center text-sm">No hay registros que coincidan. Agrega uno arriba.</p>
                    )}
                </section>
            </main>

            <PrintSheet records={printRecordsList} columns={columns} rows={rows} />
        </AppLayout>
    );
}
