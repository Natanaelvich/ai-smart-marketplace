# 🛡️ Smart Marketplace Backend (NestJS + Drizzle)

Backend da aplicação Smart Marketplace, desenvolvido com [NestJS](https://nestjs.com/) e [Drizzle ORM](https://orm.drizzle.team/) para integração type-safe com PostgreSQL.

---

## ✨ Visão Geral

- **Framework:** NestJS (TypeScript)
- **ORM:** Drizzle (PostgreSQL)
- **Banco:** PostgreSQL (com pgvector para embeddings)
- **Scripts:** Migrations, seed, reset, studio visual
- **Testes:** Unitários e E2E (Jest)
- **Containerização:** Docker Compose

---

## 🚀 Instalação e Setup

### 1. Instale as dependências

```bash
npm install
```

### 2. Suba o banco de dados (Docker)

```bash
cd ..
docker-compose up -d
```

### 3. Configure o banco (migrations + seed)

```bash
npm run db:setup
```

---

## 🗄️ Scripts de Banco

- `npm run db:setup`      — Setup completo (migrations + seed)
- `npm run db:reset`      — Reset completo do banco
- `npm run db:seed`       — Apenas seed dos dados
- `npm run db:studio`     — Interface visual do banco
- `npm run db:generate`   — Gerar nova migration
- `npm run db:migrate`    — Aplicar migrations

> 📖 Veja detalhes em [`database.md`](./database.md)

---

## 🏃‍♂️ Rodando o Projeto

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run start:prod
```

---

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes E2E
npm run test:e2e

# Cobertura de testes
npm run test:cov
```

---

## 📁 Estrutura de Pastas

```
backend/
├── src/
│   ├── app.module.ts
│   ├── catalog/
│   ├── cart/
│   ├── chat/
│   ├── shared/
│   └── main.ts
├── drizzle/
│   ├── *.sql
│   └── meta/
├── scripts/
│   └── migrate-and-seed.ts
├── test/
│   ├── *.e2e-spec.ts
│   └── jest-e2e.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔑 Variáveis de Ambiente

Veja `.env.example` para as variáveis necessárias.

---

## 📚 Documentação

- [NestJS Docs](https://docs.nestjs.com/)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs)
- [database.md](./database.md) — detalhes do schema e comandos

---

## 📝 Licença

MIT — Projeto de estudo e demonstração.
