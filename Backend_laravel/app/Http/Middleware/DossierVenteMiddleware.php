<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DossierVenteMiddleware
{
    
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->session()->isStarted()) {
            $request->session()->start();
        }

        $selectedFolder = $request->session()->get('selected_folder');

        if ($selectedFolder && isset($selectedFolder['folder_name'])) {
            $request->merge(['current_dossier_vente' => $selectedFolder['folder_name']]);
            
            $request->merge(['dossier_info' => $selectedFolder]);
        }

        return $next($request);
    }
}
