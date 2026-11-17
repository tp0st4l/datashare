import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';

export const routes: Routes = [
    {
        path: '', component: PublicLayoutComponent, children: [
            { path: '', loadComponent: () => import('./pages/upload/upload.component').then(m => m.UploadComponent) },
            { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
            { path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent) },
            { path: 'download/:token', loadComponent: () => import('./pages/download/download.component').then(m => m.DownloadComponent) },
        ]
    },
    {
        path: 'my-files', canActivate: [authGuard],
        loadComponent: () => import('./layouts/space-layout/space-layout.component').then(m => m.SpaceLayoutComponent),
        children: [
            { path: '', loadComponent: () => import('./pages/my-files/my-files.component').then(m => m.MyFilesComponent) },
        ]
    },
    { path: '**', redirectTo: '' },
];