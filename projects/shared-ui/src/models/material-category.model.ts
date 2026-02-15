export interface MaterialCategory {
  name: string;
  selector: string;
  type: 'component' | 'service' | 'directive';
  example: string;
}
