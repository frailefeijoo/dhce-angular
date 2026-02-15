# dhce-angular

Workspace Angular de distribución modular para integración desde extensión VS Code (proyecto B).

Este repositorio (proyecto A) compila dos módulos web Angular independientes:

- `data-integration`
- `code-development`

## Desarrollo

- `npm run start:data-integration`
- `npm run start:code-development`

## Compilación

- `npm run build:data-integration` genera en `modules/data-integration`
- `npm run build:code-development` genera en `modules/code-development`
- `npm run build` compila ambas aplicaciones y genera `modules/modules-manifest.json`

## Estructura

- Código de `data-integration`: `projects/data-integration`
- Código de `code-development`: `projects/code-development`
- Módulo común Angular↔Extensión: `projects/shared-extension-bridge`
- Distribución consumible por cliente: `modules/`

Cada aplicación tiene su propio `index.html` con título del módulo:

- `DataIntegration`
- `CodeDevelopment`

## Contrato de distribución para B

Cada módulo publicado incluye:

- `modules/<modulo>/index.html` (entrypoint portable)
- `modules/<modulo>/browser/*` (js/css/assets compilados)

Además se publica:

- `modules/modules-manifest.json` con lista de módulos y artefactos detectados

### Importante para Git

`modules/` debe versionarse en el repositorio para que B pueda detectar y descargar cambios.

## Integración recomendada en la extensión VS Code (B)

1. Descargar/sincronizar `modules/` del repositorio A en una carpeta local de B.
2. Leer `modules/modules-manifest.json` y mostrar los módulos disponibles en UI.
3. Para abrir un módulo en Webview:
	 - Cargar `modules/<modulo>/index.html`.
	 - Reescribir rutas relativas (`browser/...`) a URIs de webview con `webview.asWebviewUri(...)`.
	 - Definir `localResourceRoots` apuntando al directorio `modules/<modulo>`.
4. Definir CSP permitiendo scripts/estilos del propio webview source.

### Esqueleto mínimo para B (TypeScript)

```ts
const moduleRoot = vscode.Uri.file(path.join(modulesBasePath, moduleName));
const panel = vscode.window.createWebviewPanel('dhceModule', moduleName, vscode.ViewColumn.One, {
	enableScripts: true,
	localResourceRoots: [moduleRoot]
});

const indexUri = vscode.Uri.joinPath(moduleRoot, 'index.html');
let html = await vscode.workspace.fs.readFile(indexUri).then((b) => Buffer.from(b).toString('utf8'));

const rewrite = (p: string) => panel.webview.asWebviewUri(vscode.Uri.joinPath(moduleRoot, p)).toString();
html = html
	.replace(/href="(browser\/[^"]+)"/g, (_, p1) => `href="${rewrite(p1)}"`)
	.replace(/src="(browser\/[^"]+)"/g, (_, p1) => `src="${rewrite(p1)}"`);

panel.webview.html = html;
```

## Cómo validar el flujo completo

1. En A ejecutar `npm run build`.
2. Confirmar que existen:
	 - `modules/<modulo>/index.html`
	 - `modules/<modulo>/browser/*`
	 - `modules/modules-manifest.json`
3. Publicar commit de A.
4. En B sincronizar `modules/` y cargar módulo desde Webview.

## Bridge común Angular ↔ VSCode (lado A)

Se creó un módulo dinámico reutilizable para todos los proyectos Angular del workspace:

- `projects/shared-extension-bridge/src/dhce-extension-bridge.module.ts`
- `projects/shared-extension-bridge/src/dhce-extension-bridge.service.ts`

Integración en cada app standalone:

- `importProvidersFrom(DhceExtensionBridgeModule.forRoot({ channel, timeoutMs }))`

Método inicial implementado en el bridge:

- `pathExists(path)` → envía request RPC `fs.pathExists` al host de la extensión.
- `pickDirectory()` → envía request RPC `fs.pickDirectory` y espera ruta absoluta seleccionada por el host.

### Contrato de mensajes

- Request:
	- `{ channel, message: { kind: 'request', requestId, method, payload } }`
- Response:
	- `{ channel, message: { kind: 'response', requestId, ok, result?, error? } }`

## Prompt para integrar B (extensión VSCode)

Usa este prompt en el agente del proyecto B:

```text
Implementa en la extensión VS Code un router genérico de mensajes Webview para integrar con el bridge Angular del proyecto A.

Objetivo:
- Soportar mensajes RPC con contrato:
	- Request (desde Webview): { channel: 'dhce-extension-bridge', message: { kind: 'request', requestId, method, payload } }
	- Response (hacia Webview): { channel: 'dhce-extension-bridge', message: { kind: 'response', requestId, ok, result?, error? } }

Requisitos:
1) Mantener el comando existente que abre el Webview (no crear uno nuevo salvo que no exista).
2) En panel.webview.onDidReceiveMessage(...), filtrar por channel 'dhce-extension-bridge'.
3) Implementar router por method con whitelist.
4) Implementar método 'fs.pathExists':
	 - payload: { path: string }
	 - validar path no vacío
	 - comprobar existencia real en SO con fs.promises.access/stat
	 - responder { exists: boolean, error?: string }
5) Implementar método 'fs.pickDirectory':
	 - payload: {}
	 - abrir selector de carpetas de VS Code
	 - responder { path: string, cancelled: boolean }
	 - cuando path exista, debe ser ruta absoluta del SO
6) Manejar errores sin romper el panel: siempre responder ok:false + error en excepciones.
7) Preservar correlación por requestId.
8) Dejar el código preparado para futuros métodos (estructura extensible).

Entregables:
- Patch de archivos modificados en la extensión.
- Ejemplo de request/response real para fs.pathExists.
- Ejemplo de request/response real para fs.pickDirectory.
- Pasos de prueba manual desde webview.
```
