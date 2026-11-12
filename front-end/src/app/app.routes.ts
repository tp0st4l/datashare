import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { UploadComponent } from './pages/upload/upload.component';
import { RegisterComponent } from './pages/register/register.component';
import { MyFilesComponent } from './pages/my-files/my-files.component';
import { DownloadComponent } from './pages/download/download.component';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';

export const routes: Routes = [
    {
        path: '',
        component: PublicLayoutComponent,
        children: [
            { path: '', component: UploadComponent, canActivate: [authGuard] },
            { path: 'login', component: LoginComponent },
            { path: 'register', component: RegisterComponent },
            { path: 'download/:token', component: DownloadComponent },
            { path: 'my-files', component: MyFilesComponent, canActivate: [authGuard] },
        ],
    },
    { path: '**', redirectTo: '' },
];