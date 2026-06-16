---
name: mejores-practicas-react-vercel
description: "Guía completa de optimización de rendimiento para aplicaciones React y Next.js, mantenida por Vercel. Úsala al escribir nuevos componentes, implementar obtención de datos o revisar código por problemas de rendimiento."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Mejores Prácticas de React por Vercel

Guía exhaustiva de optimización de rendimiento para aplicaciones React y Next.js. Contiene 45 reglas divididas en 8 categorías, priorizadas por impacto para guiar la refactorización automatizada y la generación de código.

## Cuándo usarla
Consulta estas pautas al:
- Escribir nuevos componentes de React o páginas de Next.js.
- Implementar la obtención de datos (lado del cliente o del servidor).
- Revisar código en busca de problemas de rendimiento.
- Refactorizar código existente de React/Next.js.
- Optimizar el tamaño del bundle o los tiempos de carga.

## Categorías de Reglas por Prioridad

| Prioridad | Categoría | Impacto | Prefijo |
|----------|----------|--------|--------|
| 1 | Eliminación de Cascadas (Waterfalls) | CRÍTICO | `async-` |
| 2 | Optimización del Tamaño del Bundle | CRÍTICO | `bundle-` |
| 3 | Rendimiento del Lado del Servidor | ALTO | `server-` |
| 4 | Obtención de Datos en el Cliente | MEDIO-ALTO | `client-` |
| 5 | Optimización de Re-renderizados | MEDIO | `rerender-` |
| 6 | Rendimiento de Renderizado | MEDIO | `rendering-` |
| 7 | Rendimiento de JavaScript | BAJO-MEDIO | `js-` |
| 8 | Patrones Avanzados | BAJO | `advanced-` |

## Referencia Rápida

### 1. Eliminación de Cascadas (CRÍTICO)

- `async-defer-await` - Mover el `await` a las ramas donde realmente se utiliza el dato.
- `async-parallel` - Usar `Promise.all()` para operaciones independientes.
- `async-dependencies` - Usar mejores alternativas para dependencias parciales.
- `async-api-routes` - Iniciar promesas temprano, esperar (`await`) tarde en rutas de API.
- `async-suspense-boundaries` - Usar Suspense para transmitir (stream) contenido.

### 2. Optimización del Tamaño del Bundle (CRÍTICO)

- `bundle-barrel-imports` - Importar directamente, evitar archivos "barrel" (index.js que re-exportan todo).
- `bundle-dynamic-imports` - Usar `next/dynamic` para componentes pesados.
- `bundle-defer-third-party` - Cargar analíticas/logs después de la hidratación.
- `bundle-conditional` - Cargar módulos solo cuando la característica esté activada.
- `bundle-preload` - Precargar al pasar el cursor (hover) o enfocar para velocidad percibida.

### 3. Rendimiento del Lado del Servidor (ALTO)

- `server-cache-react` - Usar `React.cache()` para deduplicación por solicitud.
- `server-cache-lru` - Usar caché LRU para almacenamiento entre solicitudes.
- `server-serialization` - Minimizar los datos pasados a los componentes del cliente.
- `server-parallel-fetching` - Reestructurar componentes para paralelizar la obtención de datos.
- `server-after-nonblocking` - Usar `after()` para operaciones que no bloquean.

### 4. Obtención de Datos en el Cliente (MEDIO-ALTO)

- `client-swr-dedup` - Usar SWR para deduplicación automática de solicitudes.
- `client-event-listeners` - Deduplicar oyentes de eventos globales.

### 5. Optimización de Re-renderizados (MEDIO)

- `rerender-defer-reads` - No suscribirse a estados que solo se usan en callbacks.
- `rerender-memo` - Extraer trabajo costoso a componentes memorizados.
- `rerender-dependencies` - Usar dependencias primitivas en los efectos (`useEffect`).
- `rerender-derived-state` - Suscribirse a booleanos derivados, no a valores crudos.
- `rerender-functional-setstate` - Usar `setState` funcional para callbacks estables.
- `rerender-lazy-state-init` - Pasar una función a `useState` para valores iniciales costosos.
- `rerender-transitions` - Usar `startTransition` para actualizaciones no urgentes.

### 6. Rendimiento de Renderizado (MEDIO)

- `rendering-animate-svg-wrapper` - Animar el contenedor `div`, no el elemento SVG directamente.
- `rendering-content-visibility` - Usar `content-visibility` para listas largas.
- `rendering-hoist-jsx` - Extraer JSX estático fuera de los componentes.
- `rendering-svg-precision` - Reducir la precisión de las coordenadas SVG.
- `rendering-hydration-no-flicker` - Usar scripts inline para datos exclusivos del cliente.
- `rendering-activity` - Usar el componente `Activity` para mostrar/ocultar.
- `rendering-conditional-render` - Usar ternarios, no `&&` para renderizado condicional.

### 7. Rendimiento de JavaScript (BAJO-MEDIO)

- `js-batch-dom-css` - Agrupar cambios de CSS mediante clases o `cssText`.
- `js-index-maps` - Construir un `Map` para búsquedas repetidas.
- `js-cache-property-access` - Cachear propiedades de objetos en bucles.
- `js-cache-function-results` - Cachear resultados de funciones en un `Map` a nivel de módulo.
- `js-cache-storage` - Cachear lecturas de `localStorage`/`sessionStorage`.
- `js-combine-iterations` - Combinar múltiples filter/map en un solo bucle.
- `js-length-check-first` - Verificar la longitud del array antes de comparaciones costosas.
- `js-early-exit` - Retornar temprano de las funciones.
- `js-hoist-regexp` - Mover la creación de `RegExp` fuera de los bucles.
- `js-min-max-loop` - Usar bucles para min/max en lugar de `sort`.
- `js-set-map-lookups` - Usar `Set`/`Map` para búsquedas O(1).
- `js-tosorted-immutable` - Usar `toSorted()` para inmutabilidad.

### 8. Patrones Avanzados (BAJO)

- `advanced-event-handler-refs` - Almacenar manejadores de eventos en `refs`.
- `advanced-use-latest` - `useLatest` para referencias de callbacks estables.

## Cuándo usarla
Esta habilidad es aplicable para ejecutar el flujo de trabajo o las acciones descritas en el resumen.
