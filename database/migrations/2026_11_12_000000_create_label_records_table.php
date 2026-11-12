<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('label_records', function (Blueprint $table) {
            $table->id();
            $table->string('code')->nullable()->index();
            $table->string('name');
            $table->text('description')->nullable();
            $table->date('label_date')->index();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('label_records');
    }
};
