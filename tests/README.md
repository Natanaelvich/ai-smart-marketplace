# 🧪 Testes da API

Este diretório contém os testes para a rota `/generate` da API do Smart Marketplace.

## 📁 Estrutura

```
tests/
├── logger.ts              # Sistema de logs coloridos
├── generate-route.test.ts  # Testes da rota /generate
├── run-tests.ts           # Script para executar os testes
├── logs/                  # Arquivos de log dos testes
└── README.md              # Esta documentação
```

## 🚀 Como executar

### Pré-requisitos
1. Certifique-se de que o servidor está rodando:
   ```bash
   yarn dev
   ```

2. Em outro terminal, execute os testes:
   ```bash
   yarn test
   ```

### Scripts disponíveis

- `yarn test` - Executa os testes uma vez
- `yarn test:watch` - Executa os testes em modo watch (reexecuta quando há mudanças)

## 📊 Sistema de Logs

O sistema de logs oferece:

### Cores no Terminal
- 🔵 **INFO** - Informações gerais (azul)
- 🟢 **SUCCESS** - Testes que passaram (verde)
- 🔴 **ERROR** - Erros e testes que falharam (vermelho)
- 🟡 **WARNING** - Avisos (amarelo)
- 🔵 **TEST** - Execução de testes (ciano)

### Arquivos de Log
- Logs são salvos em `tests/logs/test-[timestamp].log`
- Formato estruturado com timestamp e dados JSON
- Histórico completo de todas as execuções

## 🧪 Casos de Teste

Os testes cobrem os seguintes cenários:

1. **Busca por ingredientes básicos** - Teste com mensagem comum
2. **Busca por produtos para almoço** - Teste com produtos específicos
3. **Busca por produtos para lanche** - Teste com frutas
4. **Busca por produtos específicos** - Teste com queijo e presunto
5. **Busca por produtos não disponíveis** - Teste com produtos em falta
6. **Mensagem vazia** - Teste de edge case
7. **Mensagem muito longa** - Teste de limite

## 📈 Métricas

Cada teste registra:
- ⏱️ Tempo de resposta
- 📊 Status HTTP
- 📝 Conteúdo da resposta
- ✅ Taxa de sucesso geral

## 🔧 Personalização

Para adicionar novos testes, edite o array `testCases` em `generate-route.test.ts`:

```typescript
{
  name: 'Nome do seu teste',
  message: 'Mensagem para a API',
  expectedStatus: 200,
}
```

## 📝 Exemplo de Saída

```
═══════════════════════════════ TESTE DA ROTA /generate ═══════════════════════════════
2024-01-15T10:30:00.000Z [INFO] Verificando se o servidor está rodando...
2024-01-15T10:30:00.100Z [SUCCESS] Servidor está rodando!
────────────────────────────────────────────────────────────────────────────────────────
2024-01-15T10:30:00.200Z [TEST] Executando: Busca por ingredientes básicos
2024-01-15T10:30:01.500Z [SUCCESS] ✓ Teste passou (1300ms)
{
  "status": 200,
  "message": "Preciso de ingredientes para fazer um café da manhã",
  "response": "Café, Açúcar, Leite"
}
``` 