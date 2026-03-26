import { test, expect } from '@playwright/test';

test.describe('Autenticación y Rutas Protegidas', () => {

  test('Debería redirigir a /login al intentar acceder a /panel/laboral sin sesión', async ({ page }) => {
    await page.goto('/panel/laboral');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('La página de login muestra el formulario correctamente', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toHaveText('Iniciar sesión');
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Formulario de login maneja errores del servidor (Mocking Inteligente)', async ({ page }) => {
    await page.route('**/auth/v1/token?grant_type=password', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error_description: 'Credenciales inválidas simuladas' })
      });
    });

    await page.goto('/login');
    await page.fill('input#email', 'usuario_falso@ejemplo.com');
    await page.fill('input#password', 'contraseña_incorrecta');
    await page.click('button[type="submit"]');

    const errorAlert = page.locator('p[role="alert"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Credenciales inválidas simuladas');
  });
});
