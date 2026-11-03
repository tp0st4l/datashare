import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { UploadComponent } from './pages/upload/upload.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: '', component: UploadComponent, canActivate: [authGuard] },
    { path: '**', redirectTo: '' },
];