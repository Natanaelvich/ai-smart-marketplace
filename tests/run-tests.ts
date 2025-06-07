#!/usr/bin/env tsx

import { GenerateRouteTest } from './generate-route.test';

async function main() {
  console.log('🚀 Iniciando testes da API...\n');

  const tester = new GenerateRouteTest();
  await tester.runTests();

  console.log('\n✅ Testes finalizados!');
}

main().catch(error => {
  console.error('❌ Erro ao executar testes:', error);
  process.exit(1);
});
