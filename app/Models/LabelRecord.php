<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LabelRecord extends Model
{
    protected $fillable = [
        'code', 'name', 'credit_amount', 'due_date', 'npe',
        'installment_amount', 'terms', 'description', 'label_date', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'credit_amount' => 'decimal:2',
            'installment_amount' => 'decimal:2',
            'due_date' => 'date',
            'label_date' => 'date',
        ];
    }
}
