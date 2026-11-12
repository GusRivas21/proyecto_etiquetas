<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

test('label records include a QR code generated from their code', function () {
    $user = User::factory()->create();
    $record = $user->labelRecords()->create([
        'code' => 'ITEM-001',
        'name' => 'Artículo de prueba',
        'label_date' => '2026-11-12',
    ]);

    $user->labelRecords()->create([
        'code' => null,
        'name' => 'Artículo sin código',
        'label_date' => '2026-11-12',
    ]);

    $expectedQr = 'data:image/svg+xml;base64,'.base64_encode(
        QrCode::format('svg')->size(120)->generate('ITEM-001')
    );

    $this->actingAs($user)
        ->get('/labels')
        ->assertInertia(fn (Assert $page) => $page
            ->component('labels/index')
            ->has('records', 2)
            ->where('records.1.id', $record->id)
            ->where('records.1.qr_code', $expectedQr)
            ->where('records.0.qr_code', null));
});
