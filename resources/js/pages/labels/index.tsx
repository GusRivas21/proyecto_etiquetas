import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type LabelRecord = { id: number; code: string | null; name: string; description: string | null; label_date: string };
type Filters = { search: string; from: string; to: string };

function localDate() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export default function LabelsIndex({ records, filters }: { records: LabelRecord[]; filters: Filters }) {
    const [selected, setSelected] = useState<number[]>([]);
    const [query, setQuery] = useState(filters);
    const form = useForm({ code: '', name: '', description: '', label_date: localDate() });

    function submitRecord(event: FormEvent) {
        event.preventDefault();
        form.post('/labels', { onSuccess: () => form.reset('code', 'name', 'description') });
    }

    function search(event: FormEvent) {
        event.preventDefault();
        router.get('/labels', query, { preserveState: true, preserveScroll: true });
    }

    function printRecords(ids: number[]) {
        setSelected(ids);
        document.querySelectorAll('[data-label-id]').forEach((row) => {
            row.classList.toggle('print-target', ids.includes(Number((row as HTMLElement).dataset.labelId)));
        });
        const cleanup = () => {
            document.querySelectorAll('.print-target').forEach((row) => row.classList.remove('print-target'));
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        window.setTimeout(() => window.print(), 50);
    }

    return (
        <AppLayout breadcrumbs={[{ title: 'Etiquetas', href: '/labels' }]}>
            <Head title="Lista de etiquetas" />
            <main className="space-y-6 p-4 md:p-6">
                <header className="flex flex-wrap items-start justify-between gap-3">
                    <div><h1 className="text-2xl font-semibold">Lista de etiquetas</h1><p className="mt-1 text-sm text-muted-foreground">Agrega registros, busca por texto o fecha y prepara su impresión.</p></div>
                    <div className="flex gap-2">
                        <button className="rounded border px-3 py-2 text-sm disabled:opacity-50" disabled={selected.length === 0} onClick={() => printRecords(selected)}>Imprimir seleccionadas ({selected.length})</button>
                        <button className="rounded border px-3 py-2 text-sm" onClick={() => printRecords(records.map((record) => record.id))} disabled={!records.length}>Imprimir lista</button>
                        <button className="rounded border border-red-300 px-3 py-2 text-sm text-red-700" disabled={!records.length} onClick={() => { if (window.confirm('¿Eliminar todos los registros de tu lista?')) router.delete('/labels'); }}>Eliminar lista</button>
                    </div>
                </header>

                <section className="rounded-lg border p-4">
                    <h2 className="mb-3 font-medium">Agregar registro</h2>
                    <form onSubmit={submitRecord} className="grid gap-3 md:grid-cols-4">
                        <label className="text-sm">Código<input className="mt-1 w-full rounded border px-3 py-2" value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} /></label>
                        <label className="text-sm">Nombre *<input required className="mt-1 w-full rounded border px-3 py-2" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} /></label>
                        <label className="text-sm">Descripción<input className="mt-1 w-full rounded border px-3 py-2" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} /></label>
                        <label className="text-sm">Fecha *<input required type="date" className="mt-1 w-full rounded border px-3 py-2" value={form.data.label_date} onChange={(e) => form.setData('label_date', e.target.value)} /></label>
                        <div className="md:col-span-4"><button disabled={form.processing} className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">Agregar a la lista</button>{form.errors.name && <p className="mt-1 text-sm text-red-600">{form.errors.name}</p>}</div>
                    </form>
                </section>

                <form onSubmit={search} className="grid items-end gap-3 rounded-lg border p-4 md:grid-cols-4">
                    <label className="text-sm">Buscar<input className="mt-1 w-full rounded border px-3 py-2" placeholder="Código, nombre o descripción" value={query.search} onChange={(e) => setQuery({ ...query, search: e.target.value })} /></label>
                    <label className="text-sm">Desde<input type="date" className="mt-1 w-full rounded border px-3 py-2" value={query.from} onChange={(e) => setQuery({ ...query, from: e.target.value })} /></label>
                    <label className="text-sm">Hasta<input type="date" className="mt-1 w-full rounded border px-3 py-2" value={query.to} onChange={(e) => setQuery({ ...query, to: e.target.value })} /></label>
                    <div className="flex gap-2"><button className="rounded border px-4 py-2 text-sm">Buscar</button><button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => { setQuery({ search: '', from: '', to: '' }); router.get('/labels'); }}>Limpiar</button></div>
                    {form.errors.label_date && <p className="text-sm text-red-600">{form.errors.label_date}</p>}
                </form>

                <section className="overflow-x-auto rounded-lg border">
                    <div className="border-b px-4 py-3 text-sm text-muted-foreground">{records.length} registro(s)</div>
                    <table className="w-full min-w-[700px] text-left text-sm">
                        <thead className="bg-muted/50"><tr><th className="p-3"><input aria-label="Seleccionar todos" type="checkbox" checked={records.length > 0 && selected.length === records.length} onChange={(e) => setSelected(e.target.checked ? records.map((r) => r.id) : [])} /></th><th className="p-3">Código</th><th className="p-3">Nombre</th><th className="p-3">Descripción</th><th className="p-3">Fecha</th><th className="p-3">Acciones</th></tr></thead>
                        <tbody>{records.map((record) => <tr key={record.id} className="border-t" data-label-id={record.id}><td className="p-3"><input aria-label={`Seleccionar ${record.name}`} type="checkbox" checked={selected.includes(record.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, record.id] : selected.filter((id) => id !== record.id))} /></td><td className="p-3">{record.code || '—'}</td><td className="p-3 font-medium">{record.name}</td><td className="p-3">{record.description || '—'}</td><td className="p-3">{record.label_date.slice(0, 10)}</td><td className="p-3"><div className="flex gap-2"><button className="underline" onClick={() => printRecords([record.id])}>Imprimir</button><button className="text-red-700 underline" onClick={() => { if (window.confirm('¿Eliminar este registro?')) router.delete(`/labels/${record.id}`); }}>Eliminar</button></div></td></tr>)}</tbody>
                    </table>
                    {records.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No hay registros que coincidan. Agrega uno arriba.</p>}
                </section>
            </main>
        </AppLayout>
    );
}
