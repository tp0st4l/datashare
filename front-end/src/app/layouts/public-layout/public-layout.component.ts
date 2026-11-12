import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
    selector: 'app-public-layout',
    imports: [RouterOutlet, HeaderComponent],
    templateUrl: './public-layout.component.html',
    styleUrl: './public-layout.component.css',
})
export class PublicLayoutComponent { }