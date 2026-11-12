<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LabelRecord extends Model
{
    protected $fillable = ['code', 'name', 'description', 'label_date', 'user_id'];

    protected function casts(): array
    {
        return ['label_date' => 'date'];
    }
}
