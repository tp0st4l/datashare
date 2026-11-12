import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { UploadComponent } from './pages/upload/upload.component';
import { RegisterComponent } from './pages/register/register.component';
import { MyFilesComponent } from './pages/my-files/my-files.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: '', component: UploadComponent, canActivate: [authGuard] },
    { path: 'my-files', component: MyFilesComponent, canActivate: [authGuard] },
    { path: '**', redirectTo: '' },
];