import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MaterialCategory } from '../../models/material-category.model';

@Component({
  selector: 'dhce-material-showcase',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatExpansionModule, MatListModule, MatToolbarModule],
  templateUrl: './material-showcase.component.html',
  styleUrl: './material-showcase.component.css',
})
export class DhceMaterialShowcaseComponent {
  readonly categories: MaterialCategory[] = [
    { name: 'Autocomplete', selector: 'mat-autocomplete', type: 'component', example: '<mat-autocomplete #auto="matAutocomplete">...</mat-autocomplete>' },
    { name: 'Badge', selector: 'matBadge', type: 'directive', example: '<button mat-button [matBadge]="3">Acciones</button>' },
    { name: 'Bottom Sheet', selector: 'MatBottomSheet', type: 'service', example: "bottomSheet.open(MyBottomSheetComponent)" },
    { name: 'Button', selector: 'button[mat-button]', type: 'component', example: '<button mat-raised-button color="primary">Guardar</button>' },
    { name: 'Button Toggle', selector: 'mat-button-toggle-group', type: 'component', example: '<mat-button-toggle-group>...</mat-button-toggle-group>' },
    { name: 'Card', selector: 'mat-card', type: 'component', example: '<mat-card><mat-card-title>Título</mat-card-title></mat-card>' },
    { name: 'Checkbox', selector: 'mat-checkbox', type: 'component', example: '<mat-checkbox>Confirmar</mat-checkbox>' },
    { name: 'Chips', selector: 'mat-chip-listbox', type: 'component', example: '<mat-chip-listbox><mat-chip-option>Angular</mat-chip-option></mat-chip-listbox>' },
    { name: 'Datepicker', selector: 'mat-datepicker', type: 'component', example: '<input matInput [matDatepicker]="picker" /><mat-datepicker #picker></mat-datepicker>' },
    { name: 'Dialog', selector: 'MatDialog', type: 'service', example: "dialog.open(MyDialogComponent)" },
    { name: 'Divider', selector: 'mat-divider', type: 'component', example: '<mat-divider></mat-divider>' },
    { name: 'Expansion', selector: 'mat-expansion-panel', type: 'component', example: '<mat-expansion-panel>...</mat-expansion-panel>' },
    { name: 'Form Field', selector: 'mat-form-field', type: 'component', example: '<mat-form-field><mat-label>Nombre</mat-label><input matInput /></mat-form-field>' },
    { name: 'Grid List', selector: 'mat-grid-list', type: 'component', example: '<mat-grid-list cols="3"><mat-grid-tile>1</mat-grid-tile></mat-grid-list>' },
    { name: 'Icon', selector: 'mat-icon', type: 'component', example: '<mat-icon>settings</mat-icon>' },
    { name: 'Input', selector: 'input[matInput]', type: 'directive', example: '<input matInput placeholder="Buscar" />' },
    { name: 'List', selector: 'mat-list', type: 'component', example: '<mat-list><mat-list-item>Elemento</mat-list-item></mat-list>' },
    { name: 'Menu', selector: 'mat-menu', type: 'component', example: '<mat-menu #menu="matMenu"><button mat-menu-item>Abrir</button></mat-menu>' },
    { name: 'Paginator', selector: 'mat-paginator', type: 'component', example: '<mat-paginator [length]="100" [pageSize]="10"></mat-paginator>' },
    { name: 'Progress Bar', selector: 'mat-progress-bar', type: 'component', example: '<mat-progress-bar mode="determinate" value="60"></mat-progress-bar>' },
    { name: 'Progress Spinner', selector: 'mat-progress-spinner', type: 'component', example: '<mat-progress-spinner mode="indeterminate"></mat-progress-spinner>' },
    { name: 'Radio', selector: 'mat-radio-group', type: 'component', example: '<mat-radio-group><mat-radio-button value="a">A</mat-radio-button></mat-radio-group>' },
    { name: 'Select', selector: 'mat-select', type: 'component', example: '<mat-form-field><mat-select><mat-option>Alta</mat-option></mat-select></mat-form-field>' },
    { name: 'Sidenav', selector: 'mat-sidenav-container', type: 'component', example: '<mat-sidenav-container><mat-sidenav opened>Menú</mat-sidenav></mat-sidenav-container>' },
    { name: 'Slide Toggle', selector: 'mat-slide-toggle', type: 'component', example: '<mat-slide-toggle>Activar</mat-slide-toggle>' },
    { name: 'Slider', selector: 'mat-slider', type: 'component', example: '<mat-slider min="0" max="100"><input matSliderThumb /></mat-slider>' },
    { name: 'Snack-bar', selector: 'MatSnackBar', type: 'service', example: "snackBar.open('Guardado', 'Cerrar')" },
    { name: 'Sort', selector: 'matSort', type: 'directive', example: '<table mat-table matSort>...</table>' },
    { name: 'Stepper', selector: 'mat-stepper', type: 'component', example: '<mat-stepper><mat-step label="Paso 1">...</mat-step></mat-stepper>' },
    { name: 'Table', selector: 'mat-table', type: 'component', example: '<table mat-table [dataSource]="dataSource">...</table>' },
    { name: 'Tabs', selector: 'mat-tab-group', type: 'component', example: '<mat-tab-group><mat-tab label="A1">...</mat-tab></mat-tab-group>' },
    { name: 'Toolbar', selector: 'mat-toolbar', type: 'component', example: '<mat-toolbar color="primary">Título</mat-toolbar>' },
    { name: 'Tooltip', selector: 'matTooltip', type: 'directive', example: '<button mat-button matTooltip="Información">Info</button>' },
    { name: 'Tree', selector: 'mat-tree', type: 'component', example: '<mat-tree [dataSource]="data">...</mat-tree>' },
    { name: 'Ripple', selector: 'matRipple', type: 'directive', example: '<div matRipple>Zona interactiva</div>' },
  ];
}
