import { logger } from './logger';

interface TestCase {
  name: string;
  message: string;
  expectedStatus: number;
}

class GenerateRouteTest {
  private baseUrl: string;
  private testCases: TestCase[];

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testCases = [
      {
        name: 'Busca por ingredientes básicos',
        message: 'Preciso de ingredientes para fazer um café da manhã',
        expectedStatus: 200,
      },
      {
        name: 'Busca por produtos para almoço',
        message: 'Quero fazer um almoço com arroz e feijão',
        expectedStatus: 200,
      },
      {
        name: 'Busca por produtos para lanche',
        message: 'Preciso de frutas para um lanche saudável',
        expectedStatus: 200,
      },
      {
        name: 'Busca por produtos específicos',
        message: 'Quero comprar queijo e presunto',
        expectedStatus: 200,
      },
      {
        name: 'Busca por produtos não disponíveis',
        message: 'Preciso de leite e macarrão',
        expectedStatus: 200,
      },
      {
        name: 'Mensagem vazia',
        message: '',
        expectedStatus: 200,
      },
      {
        name: 'Mensagem muito longa',
        message: 'A'.repeat(1000),
        expectedStatus: 200,
      },
    ];
  }

  private async makeRequest(message: string): Promise<{
    status: number;
    data: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      return {
        status: response.status,
        data,
      };
    } catch (error) {
      return {
        status: 0,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
      });
      return response.status !== 0;
    } catch {
      return false;
    }
  }

  async runTests(): Promise<void> {
    logger.header('TESTE DA ROTA /generate');

    // Verificar se o servidor está rodando
    logger.info('Verificando se o servidor está rodando...');
    const isServerRunning = await this.checkServerHealth();

    if (!isServerRunning) {
      logger.error('Servidor não está rodando!', {
        url: this.baseUrl,
        message: 'Certifique-se de que o servidor está rodando na porta 3000',
      });
      return;
    }

    logger.success('Servidor está rodando!');
    logger.separator();

    let passedTests = 0;
    let failedTests = 0;

    for (const testCase of this.testCases) {
      logger.test(`Executando: ${testCase.name}`);

      const startTime = Date.now();
      const result = await this.makeRequest(testCase.message);
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (result.error) {
        logger.error(`Erro na requisição: ${result.error}`);
        failedTests++;
        continue;
      }

      const statusMatch = result.status === testCase.expectedStatus;

      if (statusMatch) {
        logger.success(`✓ Teste passou (${duration}ms)`, {
          status: result.status,
          message: testCase.message,
          response: result.data,
        });
        passedTests++;
      } else {
        logger.error(`✗ Teste falhou (${duration}ms)`, {
          expected_status: testCase.expectedStatus,
          actual_status: result.status,
          message: testCase.message,
          response: result.data,
        });
        failedTests++;
      }

      logger.separator();
    }

    // Resumo dos testes
    logger.header('RESUMO DOS TESTES');
    logger.info(`Total de testes: ${this.testCases.length}`);
    logger.success(`Testes aprovados: ${passedTests}`);

    if (failedTests > 0) {
      logger.error(`Testes falharam: ${failedTests}`);
    } else {
      logger.success('Todos os testes passaram! 🎉');
    }

    const successRate = ((passedTests / this.testCases.length) * 100).toFixed(
      1
    );
    logger.info(`Taxa de sucesso: ${successRate}%`);
  }
}

// Executar os testes se o arquivo for executado diretamente
if (require.main === module) {
  const tester = new GenerateRouteTest();
  tester.runTests().catch(error => {
    logger.error('Erro ao executar testes:', error);
    process.exit(1);
  });
}

export { GenerateRouteTest };
