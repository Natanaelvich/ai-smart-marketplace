import { test, expect } from '@playwright/test';

// Ajuste a mensagem conforme o backend esteja mockado ou real
const TEST_MESSAGE = 'Sugira uma receita fácil para o jantar';

test.describe('Chat E2E', () => {
  test('fluxo básico de chat', async ({ page }) => {
    // 1. Acessa a home
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.screenshot({ path: './frontend/test-results/01-home.png' });

    // 2. Inicia nova conversa se o botão estiver visível
    await page.getByRole('button', { name: 'Iniciar Nova Conversa' }).nth(1).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: './frontend/test-results/02-nova-conversa.png' });

    // 3. Envia uma mensagem
    await page.getByPlaceholder('Digite sua mensagem...').fill(TEST_MESSAGE);
    await page.locator('#send-message').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: './frontend/test-results/03-mensagem-enviada.png' });

    // 4. Aguarda resposta do assistente
    await expect(page.getByText(TEST_MESSAGE)).toBeVisible(); // Mensagem do usuário
    await expect(page.getByText(/assistente está pensando/i)).toBeVisible();
    // Aguarda sumir o loader
    await expect(page.getByText(/assistente está pensando/i)).not.toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: './frontend/test-results/04-resposta-assistente.png' });

    // 5. Verifica se há resposta do assistente
    await expect(page.locator('.bg-gray-100')).toBeVisible();
  });
}); 