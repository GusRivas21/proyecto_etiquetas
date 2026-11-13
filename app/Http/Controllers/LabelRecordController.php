<?php

namespace App\Http\Controllers;

use App\Models\LabelRecord;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Picqer\Barcode\BarcodeGeneratorSVG;

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
                        ->orWhere('npe', 'like', "%{$search}%")
                        ->orWhere('terms', 'like', "%{$search}%");
                });
            })
            ->when($filters['from'] ?? null, fn ($query, $from) => $query->whereDate('due_date', '>=', $from))
            ->when($filters['to'] ?? null, fn ($query, $to) => $query->whereDate('due_date', '<=', $to))
            ->orderBy('due_date')->orderByDesc('id')->get()
            ->map(function (LabelRecord $record) {
                $barcode = null;
                if (filled($record->code)) {
                    try {
                        $barcode = 'data:image/svg+xml;base64,'.base64_encode(
                            (new BarcodeGeneratorSVG())->getBarcode($record->code, BarcodeGeneratorSVG::TYPE_CODE_128, 1.5, 36)
                        );
                    } catch (\InvalidArgumentException) {
                        // El código puede contener datos que Code 128 no acepta; el QR sigue disponible.
                    }
                }

                return [
                ...$record->toArray(),
                'qr_code' => filled($record->code)
                    ? 'data:image/svg+xml;base64,'.base64_encode(QrCode::format('svg')->size(120)->generate($record->code))
                    : null,
                'barcode' => $barcode,
                ];
            });

        return Inertia::render('labels/index', [
            'records' => $records,
            'filters' => ['search' => $filters['search'] ?? '', 'from' => $filters['from'] ?? '', 'to' => $filters['to'] ?? ''],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:80', 'regex:/^[\x20-\x7E]+$/'],
            'name' => ['required', 'string', 'max:160'],
            'credit_amount' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'due_date' => ['nullable', 'date'],
            'npe' => ['nullable', 'string', 'max:100'],
            'installment_amount' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'terms' => ['nullable', 'string', 'max:1000'],
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
