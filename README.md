# mapeAR (MVP local) — Node + TypeScript + MongoDB

Incluye:
- **API** (Express + TypeScript + Mongoose + JWT)
- **Web** (Next.js + TypeScript)
- Login / Register
- Tenants (Analista)
- Administración de suscriptores (habilitar / deshabilitar / permisos de sugerencias)
- Solicitud de acceso del subscriber

## Requisitos
- Node 20+ (recomendado)
- Docker (para MongoDB)

## 1) Levantar MongoDB
En la raíz del proyecto:

```bash
docker compose up -d
```

## 2) Instalar dependencias
En la raíz:

```bash
npm install
```

## 3) Configurar variables de entorno

### API
Copiá el ejemplo y ajustá si querés:

```bash
cp apps/api/.env.example apps/api/.env
```

### Web
```bash
cp apps/web/.env.local.example apps/web/.env.local
```

## 4) Levantar en modo dev
En la raíz:

```bash
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:3000

## Uso rápido
1. Registrate como **ANALYST** (en /register).  
2. Logueate como analista. En **Dashboard** te va a aparecer tu `tenantId`.
3. Abrí una ventana incógnito y registrate como **SUBSCRIBER**.
4. En el dashboard del subscriber, pegá el `tenantId` y enviá solicitud.
5. Volvé al analista → sección Subscribers → **Approve / Revoke**.

## Notas
- Este MVP **no incluye pagos** ni mapa interactivo todavía; deja la base lista para integrar MapLibre y capas.
- Los permisos de “moderador” se modelan con flags:
  - `canSuggestContent`
  - `canSuggestRelations`
