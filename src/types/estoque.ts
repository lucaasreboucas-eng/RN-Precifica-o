export interface Produto {
  id: string;
  codigo: string;
  descricao: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MovimentacaoItem {
  produtoId: string;
  codigo: string;
  descricao: string;
  quantidade: number;
}

export interface Movimentacao {
  id: string;
  dataHora: string;
  itens: MovimentacaoItem[];
  placaVeiculo: string;
  modeloVeiculo: string;
  responsavel: string;
  mecanico?: string;
  quemPegou?: 'vendedor' | 'mecanico' | '';
  updatedAt?: string;
}
