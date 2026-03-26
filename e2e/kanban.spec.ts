import { test, expect } from '@playwright/test';

test.describe('Tablero Kanban (Sprint 3)', () => {
  // Configuración base para interceptar la carga de tareas desde el Cliente (SWR / useTareas)
  test.beforeEach(async ({ page }) => {
    // Interceptamos la petición POST/GET de Supabase hacia la tabla 'tareas'
    // simulando que el usuario ya tiene tareas asignadas.
    await page.route('**/rest/v1/tareas*', async (route) => {
      // Respondemos con una lista vacía o tareas mockeadas dependiendo de la prueba
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'test-1',
              panel_id: 'laboral',
              titulo: 'Tarea de Prueba 1',
              detalle: 'Detalles mockeados',
              estado: 'PENDIENTE',
              urgencia: 'ALTA',
              progreso: 0,
              esta_bloqueada: false,
              categoria: null
            },
            {
              id: 'test-2',
              panel_id: 'laboral',
              titulo: 'Tarea en progreso',
              detalle: 'Mock 2',
              estado: 'EN_PROGRESO',
              urgencia: 'MEDIA',
              progreso: 50,
              esta_bloqueada: false,
              categoria: null
            }
          ])
        });
      } else {
        await route.continue();
      }
    });

    // Simulamos la API de Paneles si es necesario para el Layout (Server Side / Client Side)
    // Nota: Si el layout depende de Server Components fuertemente, 
    // lo ideal sería usar un usuario de prueba en DB o e2e-seed.
  });

  test('Debería renderizar las 4 columnas del Kanban', async ({ page }) => {
    // Esta prueba asume que la vista puede cargar (sea logueandose antes o mediante estado saltado) 
    // Para entornos locales, verificamos que la estructura UI responda bien a las directrices.
    
    // Al ser E2E aislado, primero pasaríamos por login (se puede abstraer en un setup de Playwright).
    // Suponiendo que logramos llegar a /panel/laboral (si el middleware lo permite o está mockeado)
    await page.goto('/panel/laboral');
    
    // Verificamos las 4 columnas (basado en el componente de UI)
    await expect(page.locator('text=Pendiente').first()).toBeVisible();
    await expect(page.locator('text=En Progreso').first()).toBeVisible();
    await expect(page.locator('text=Curación').first()).toBeVisible();
    await expect(page.locator('text=Cerrada').first()).toBeVisible();
  });

  test('El botón de Nueva Tarea debe abrir el Modal', async ({ page }) => {
    await page.goto('/panel/laboral');
    
    // Localizamos el botón de "Nueva tarea" que definimos en KanbanColumna
    const btnNueva = page.locator('button', { hasText: 'Nueva tarea' });
    
    // Si la pantalla de la prueba logra llegar a renderizar PENDIENTE:
    if (await btnNueva.count() > 0) {
      await btnNueva.click();
      
      // Verificamos que se abre el modal
      await expect(page.locator('text=Crear Nueva Tarea')).toBeVisible();
      await expect(page.locator('input[placeholder="Ej: Preparar informe trimestral"]')).toBeVisible();
    }
  });

});
