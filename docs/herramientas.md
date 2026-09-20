# Herramientas instaladas en el repositorio

Todas quedan configuradas en el proyecto; con `npm install` se descargan las dependencias de
desarrollo (no se despliegan en Plesk).

## 1. Repomix — <https://github.com/yamadashy/repomix>

Empaqueta el repositorio en un solo archivo apto para análisis con IA.

- Dependencia de desarrollo en `package.json` (`repomix ^1.18.0`).
- Configuración en `repomix.config.json`: salida `repomix-output.xml`, ignora librerías de
  terceros, datos generados y las referencias HIG de la skill de diseño; con verificación de
  seguridad (secretos) activada.
- Uso: `npm run repomix` (XML) o `npm run repomix:web` (Markdown en `docs/repomix-output.md`).
  Las salidas están en `.gitignore`.

## 2. Skills de Anthropic — <https://github.com/anthropics/skills>

Registradas como *marketplace* de plugins de Claude Code en `.claude/settings.json`
(`extraKnownMarketplaces.anthropic-agent-skills`) con los plugins `document-skills` (docx, pdf,
pptx, xlsx) y `example-skills` (frontend-design, canvas-design, webapp-testing, mcp-builder,
skill-creator, etc.) habilitados. Al abrir el repositorio en Claude Code se ofrece instalarlos;
también se pueden instalar manualmente:

```
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
/plugin install example-skills@anthropic-agent-skills
```

## 3. Chrome DevTools MCP — <https://github.com/ChromeDevTools/chrome-devtools-mcp>

- Servidor MCP declarado en `.mcp.json` (`npx -y chrome-devtools-mcp@latest --headless
  --isolated`), habilitado automáticamente con `enableAllProjectMcpServers`.
- Registrado además como marketplace `chrome-devtools-plugins` en `.claude/settings.json`
  (plugin `chrome-devtools-mcp`, que añade skills de depuración).
- Uso: `npm run mcp:chrome` para lanzarlo manualmente, o desde Claude Code pedir, por ejemplo,
  «Abre http://127.0.0.1:8080 y revisa los errores de consola del juego».

## 4. Claude Code Security Review — <https://github.com/anthropics/claude-code-security-review>

- Flujo de GitHub Actions en `.github/workflows/security.yml`: en cada *pull request* analiza el
  diff con Claude y comenta las vulnerabilidades encontradas (excluye librerías de terceros).
- Requiere el secreto `CLAUDE_API_KEY` en *Settings → Secrets and variables → Actions* del
  repositorio. Recomendado: activar «Require approval for all external contributors».
- Localmente se puede usar el comando `/security-review` de Claude Code sobre los cambios.

## 5. Skill de diseño apple-design — <https://github.com/dickwu/apple-design-skill>

Copiada en `.claude/skills/apple-design/` (SKILL.md más 122 páginas de las Human Interface
Guidelines en `references/hig/`). Se activa en Claude Code con `/apple-design` o
automáticamente al pedir revisiones de interfaz («revisa el diseño», «hazlo menos genérico»).

Se aplicó al diseño de este juego en su modo de mejora: sistema compacto de tokens (color, tipo,
disposición, elemento distintivo), controles de 44 px, un solo color por significado, feedback en
la interfaz y no en alertas, y foco visible en escritorio. Ver `docs/diseno.md`.

## Pruebas end-to-end

`tests/e2e.mjs` recorre el juego completo con Playwright (Chromium): registro del nombre,
bloqueo de niveles, nivel 1 completo con descarga del diploma PDF, fallo intencional con
explicación, ranking, niveles 3 y 4 y vista móvil sin desplazamiento. Ejecutar con el servidor
local activo: `npm run test:e2e`. La página acepta `?debug=1` para exponer `window.WJ_DEBUG`
(estado, `startGame`, `correctIndex`), usado solo por las pruebas.
