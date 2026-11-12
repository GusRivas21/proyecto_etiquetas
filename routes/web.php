<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\LabelRecordController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', fn () => redirect()->route('labels.index'))->name('dashboard');
    Route::get('labels', [LabelRecordController::class, 'index'])->name('labels.index');
    Route::post('labels', [LabelRecordController::class, 'store'])->name('labels.store');
    Route::delete('labels', [LabelRecordController::class, 'destroyAll'])->name('labels.destroy-all');
    Route::delete('labels/{labelRecord}', [LabelRecordController::class, 'destroy'])->name('labels.destroy');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
