import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse, MeResponse, RegisterRequest } from '../models/auth';

const TOKEN_KEY = 'authToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly loggedInState = signal(this.isLoggedIn());
    readonly loggedIn = this.loggedInState.asReadonly();

    register(request: RegisterRequest): Observable<void> {
        return this.http.post<void>('/api/auth/register', request);
    }

    login(request: LoginRequest): Observable<LoginResponse> {
        return this.http
            .post<LoginResponse>('/api/auth/login', request)
            .pipe(
                tap((response) => {
                    localStorage.setItem(TOKEN_KEY, response.accessToken);
                    this.loggedInState.set(true);
                }),
            );
    }

    me(): Observable<MeResponse> {
        return this.http.get<MeResponse>('/api/auth/me');
    }

    logout(): void {
        localStorage.removeItem(TOKEN_KEY);
        this.loggedInState.set(false);
    }

    getToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    }

    isLoggedIn(): boolean {
        const token = this.getToken();
        return token !== null && !this.isTokenExpired(token);
    }

    private isTokenExpired(token: string): boolean {
        try {
            const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const { exp } = JSON.parse(atob(payload));
            return exp * 1000 < Date.now();
        } catch {
            return true;
        }
    }
}