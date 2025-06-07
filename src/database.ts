const produtos: {
    nome: string;
    estoque: number;
  }[] = [
    { nome: 'Feijão', estoque: 10 },
    { nome: 'Arroz', estoque: 5 },
    { nome: 'Macarrão', estoque: 0 },
    { nome: 'Óleo', estoque: 2 },
    { nome: 'Açúcar', estoque: 1 },
    { nome: 'Sal', estoque: 0 },
    { nome: 'Farinha', estoque: 3 },
    { nome: 'Café', estoque: 4 },
    { nome: 'Leite', estoque: 0 },
    { nome: 'Iogurte Grego', estoque: 0 },
    { nome: 'Queijo Manteiga', estoque: 5 },
    { nome: 'Presunto', estoque: 10 },
    { nome: 'Aveia', estoque: 10 },
    { nome: 'Maçã', estoque: 10 },
    { nome: 'Banana', estoque: 10 },
  ];
  
  export const produtosEmEstoque = () => {
    return produtos.filter((produto) => produto.estoque > 0).map(p => p.nome);
  };
  
  export const produtosEmFalta = () => {
    return produtos.filter((produto) => produto.estoque === 0).map(p => p.nome);
  };