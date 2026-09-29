<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Medicament extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
        'famille'
    ];

    public function scopeSearch(Builder $query, string $search = null)
    {
        if ($search) {
            return $query->where('nom', 'ILIKE', "%{$search}%")
                        ->orWhere('famille', 'ILIKE', "%{$search}%");
        }
        return $query;
    }

    public function scopeByFamily(Builder $query, string $famille = null)
    {
        if ($famille) {
            return $query->where('famille', $famille);
        }
        return $query;
    }

    public static function getFamilies()
    {
        return cache()->remember('medicaments.families', 3600, function () {
            return self::distinct('famille')
                      ->orderBy('famille')
                      ->pluck('famille')
                      ->filter()
                      ->values();
        });
    }
}
