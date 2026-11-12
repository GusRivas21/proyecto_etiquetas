<?php

namespace App\Http\Controllers;

use App\Models\LabelRecord;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class LabelRecordController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        // Los filtros se aplican en el servidor para trabajar bien con listas grandes.
        $records = LabelRecord::query()
            ->where('user_id', $request->user()->id)
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($filters['from'] ?? null, fn ($query, $from) => $query->whereDate('label_date', '>=', $from))
            ->when($filters['to'] ?? null, fn ($query, $to) => $query->whereDate('label_date', '<=', $to))
            ->orderByDesc('label_date')->orderByDesc('id')->get()
            ->map(fn (LabelRecord $record) => [
                ...$record->toArray(),
                'qr_code' => filled($record->code)
                    ? 'data:image/svg+xml;base64,'.base64_encode(QrCode::format('svg')->size(120)->generate($record->code))
                    : null,
            ]);

        return Inertia::render('labels/index', [
            'records' => $records,
            'filters' => ['search' => $filters['search'] ?? '', 'from' => $filters['from'] ?? '', 'to' => $filters['to'] ?? ''],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:1000'],
            'label_date' => ['required', 'date'],
        ]);

        $request->user()->labelRecords()->create($data);

        return back()->with('success', 'Registro agregado a la lista.');
    }

    public function destroy(Request $request, LabelRecord $labelRecord): RedirectResponse
    {
        abort_unless($labelRecord->user_id === $request->user()->id, 403);
        $labelRecord->delete();

        return back()->with('success', 'Registro eliminado.');
    }

    public function destroyAll(Request $request): RedirectResponse
    {
        LabelRecord::where('user_id', $request->user()->id)->delete();

        return redirect()->route('labels.index')->with('success', 'Se eliminó toda tu lista.');
    }
}
