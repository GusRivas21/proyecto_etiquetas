<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('label_records', function (Blueprint $table) {
            $table->decimal('credit_amount', 10, 2)->nullable()->after('name');
            $table->date('due_date')->nullable()->after('credit_amount')->index();
            $table->string('npe', 100)->nullable()->after('due_date')->index();
            $table->decimal('installment_amount', 10, 2)->nullable()->after('npe');
            $table->text('terms')->nullable()->after('installment_amount');
        });
    }

    public function down(): void
    {
        Schema::table('label_records', function (Blueprint $table) {
            $table->dropIndex(['due_date']);
            $table->dropIndex(['npe']);
            $table->dropColumn(['credit_amount', 'due_date', 'npe', 'installment_amount', 'terms']);
        });
    }
};
