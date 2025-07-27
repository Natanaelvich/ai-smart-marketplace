import { test, expect } from '@playwright/test';

// Ajuste a mensagem conforme o backend esteja mockado ou real
const TEST_MESSAGE = 'Sugira uma receita fácil para o jantar';
const TEST_MESSAGE_CONFIRMATION = 'Sim, quero essa';

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

    // 5. Envia uma mensagem de confirmação
    await page.getByPlaceholder('Digite sua mensagem...').fill(TEST_MESSAGE_CONFIRMATION);
    await page.locator('#send-message').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: './frontend/test-results/05-mensagem-confirmacao.png' });

    // 6. Verifica se o carrinho foi atualizado
    await expect(page.getByRole('button', { name: 'Confirmar ação' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar ação' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: './frontend/test-results/06-carrinho-atualizado.png' });

    // 7. Verifica se o carrinho foi atualizado
    await expect(page.getByText(/Carrinhos sugeridos com base nos produtos disponíveis./i)).toBeVisible({timeout: 15000});
    await page.screenshot({ path: './frontend/test-results/07-carrinhos-sugeridos.png' });

    // 8. Seleciona um carrinho
    await page.getByRole('link', { name: 'Meu Carrinho' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: './frontend/test-results/08-carrinho-selecionado.png' });
    
  });
}); 