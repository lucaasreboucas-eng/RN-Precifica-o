import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Car,
  User,
  Calendar,
  Hash,
  X,
  Check,
  FilterX,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import type { Produto, Movimentacao, MovimentacaoItem } from '../../types/estoque';
import { supabase, getSupabaseClient } from '../../lib/supabase';

const MOV_STORAGE_KEY = 'rn_precificacao_movimentacoes_prod_v1';
const DELETED_MOV_KEY = 'rn_precificacao_deleted_movimentacoes_v1';
const PROD_STORAGE_KEY = 'rn_precificacao_produtos_prod_v1';
const DELETED_PROD_KEY = 'rn_precificacao_deleted_produtos_v1';

const getLocalDeletedSet = (key: string): Set<string> => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((id) => typeof id === 'string' && id.trim().length > 0));
      }
    }
  } catch {}
  return new Set<string>();
};

const saveLocalDeletedSet = (key: string, ids: Set<string> | string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch {}
};

const formatDateTimeBR = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const getLocalDateYMD = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
};

export const MovimentacoesView: React.FC = () => {
  // Movimentações registradas
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>(() => {
    try {
      const deletedIds = getLocalDeletedSet(DELETED_MOV_KEY);
      const saved = localStorage.getItem(MOV_STORAGE_KEY);
      if (saved) {
        const parsed: Movimentacao[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((m) => m && m.id && !deletedIds.has(m.id));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Produtos cadastrados (provenientes da aba Cadastro de Produtos)
  const [produtosCadastrados, setProdutosCadastrados] = useState<Produto[]>(() => {
    try {
      const deletedIds = getLocalDeletedSet(DELETED_PROD_KEY);
      const saved = localStorage.getItem(PROD_STORAGE_KEY);
      if (saved) {
        const parsed: Produto[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p) => p && p.id && !deletedIds.has(p.id));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Navegação lista / cadastro-edição
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingMov, setEditingMov] = useState<Movimentacao | null>(null);

  // Filtros de pesquisa da tabela
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResponsavel, setFilterResponsavel] = useState('');
  const [filterPlaca, setFilterPlaca] = useState('');
  const [filterDataInicio, setFilterDataInicio] = useState('');
  const [filterDataFim, setFilterDataFim] = useState('');

  // Modal de confirmação de exclusão
  const [deletingMov, setDeletingMov] = useState<Movimentacao | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Estados do formulário de movimentação
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showInlineSuggestions, setShowInlineSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [itemQuantity, setItemQuantity] = useState<string>('1');
  const [itemError, setItemError] = useState<string | null>(null);
  const [itensMovimentacao, setItensMovimentacao] = useState<MovimentacaoItem[]>([]);

  const [placaVeiculo, setPlacaVeiculo] = useState('');
  const [modeloVeiculo, setModeloVeiculo] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [formErrors, setFormErrors] = useState<{
    itens?: string;
    placaVeiculo?: string;
    modeloVeiculo?: string;
    responsavel?: string;
    general?: string;
  }>({});

  // Janela (Modal) de Pesquisa de Produtos
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [modalProductSearch, setModalProductSearch] = useState('');
  const [modalSelectedProduct, setModalSelectedProduct] = useState<Produto | null>(null);
  const [modalQuantity, setModalQuantity] = useState<string>('1');
  const [modalError, setModalError] = useState<string | null>(null);

  // Carregamento e sincronização de movimentações e produtos
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const deletedMovIds = getLocalDeletedSet(DELETED_MOV_KEY);
        const deletedProdIds = getLocalDeletedSet(DELETED_PROD_KEY);

        let localMovs: Movimentacao[] = [];
        try {
          const rawMovs = localStorage.getItem(MOV_STORAGE_KEY);
          if (rawMovs) {
            const parsed = JSON.parse(rawMovs);
            if (Array.isArray(parsed)) {
              localMovs = parsed.filter((m: Movimentacao) => m && m.id && !deletedMovIds.has(m.id));
            }
          }
        } catch {}

        let localProds: Produto[] = [];
        try {
          const rawProds = localStorage.getItem(PROD_STORAGE_KEY);
          if (rawProds) {
            const parsed = JSON.parse(rawProds);
            if (Array.isArray(parsed)) {
              localProds = parsed.filter((p: Produto) => p && p.id && !deletedProdIds.has(p.id));
            }
          }
        } catch {}

        const syncRes = await fetch('/api/store/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movimentacoes: localMovs,
            deletedMovimentacaoIds: Array.from(deletedMovIds),
            produtos: localProds,
            deletedProdutoIds: Array.from(deletedProdIds),
          }),
        });

        if (syncRes.ok && isMounted) {
          const storeData = await syncRes.json();

          if (Array.isArray(storeData.deletedMovimentacaoIds)) {
            let updated = false;
            storeData.deletedMovimentacaoIds.forEach((id: string) => {
              if (typeof id === 'string' && id.trim() && !deletedMovIds.has(id)) {
                deletedMovIds.add(id);
                updated = true;
              }
            });
            if (updated) saveLocalDeletedSet(DELETED_MOV_KEY, deletedMovIds);
          }

          if (Array.isArray(storeData.deletedProdutoIds)) {
            let updated = false;
            storeData.deletedProdutoIds.forEach((id: string) => {
              if (typeof id === 'string' && id.trim() && !deletedProdIds.has(id)) {
                deletedProdIds.add(id);
                updated = true;
              }
            });
            if (updated) saveLocalDeletedSet(DELETED_PROD_KEY, deletedProdIds);
          }

          if (Array.isArray(storeData.movimentacoes)) {
            const validServerMovs: Movimentacao[] = storeData.movimentacoes.filter(
              (m: any) => m && m.id && !deletedMovIds.has(m.id)
            );
            const serverIds = new Set(validServerMovs.map((m) => m.id));
            const missingOnServer = localMovs.filter(
              (l) => !serverIds.has(l.id) && !deletedMovIds.has(l.id)
            );
            const merged = [...validServerMovs, ...missingOnServer];
            setMovimentacoes(merged);
            localStorage.setItem(MOV_STORAGE_KEY, JSON.stringify(merged));
            localMovs = merged;
          }

          if (Array.isArray(storeData.produtos)) {
            const validServerProds: Produto[] = storeData.produtos.filter(
              (p: any) => p && p.id && !deletedProdIds.has(p.id)
            );
            const serverIds = new Set(validServerProds.map((p) => p.id));
            const missingOnServer = localProds.filter(
              (l) => !serverIds.has(l.id) && !deletedProdIds.has(l.id)
            );
            const mergedProds = [...validServerProds, ...missingOnServer];
            setProdutosCadastrados(mergedProds);
            localStorage.setItem(PROD_STORAGE_KEY, JSON.stringify(mergedProds));
            localProds = mergedProds;
          }
        }

        // Sincroniza movimentações e produtos com Supabase
        try {
          const client = await getSupabaseClient();
          if (client) {
            // 1. Produtos do Supabase
            const { data: supProds, error: supProdsError } = await client
              .from('produtos')
              .select('*')
              .order('created_at', { ascending: false });

            if (!supProdsError && Array.isArray(supProds) && isMounted) {
              const validRemoteProds = supProds.filter(
                (row: any) => row && row.id && !deletedProdIds.has(row.id)
              );

              if (validRemoteProds.length > 0 || supProds.length > 0) {
                const mappedProds: Produto[] = validRemoteProds.map((row: any) => ({
                  id: row.id,
                  codigo: row.codigo,
                  descricao: row.descricao,
                  createdAt: row.created_at || new Date().toISOString(),
                  updatedAt: row.updated_at || undefined,
                }));

                const remoteProdIds = new Set(mappedProds.map((p) => p.id));
                const unsyncedProds = localProds.filter(
                  (l) => l.id && !remoteProdIds.has(l.id) && !deletedProdIds.has(l.id)
                );
                const mergedProds = [...unsyncedProds, ...mappedProds];
                setProdutosCadastrados(mergedProds);
                localStorage.setItem(PROD_STORAGE_KEY, JSON.stringify(mergedProds));
                fetch('/api/store/produtos', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ produtos: mergedProds }),
                }).catch(() => {});
              }
            }

            // 2. Movimentações do Supabase
            const { data: supMovs, error: supMovsError } = await client
              .from('movimentacoes')
              .select('*')
              .order('data_hora', { ascending: false });

            if (!supMovsError && Array.isArray(supMovs) && isMounted) {
              supMovs.forEach((row: any) => {
                if (row && row.id && deletedMovIds.has(row.id)) {
                  Promise.resolve(client.from('movimentacoes').delete().eq('id', row.id)).catch(
                    () => {}
                  );
                }
              });

              const validRemoteMovs = supMovs.filter(
                (row: any) => row && row.id && !deletedMovIds.has(row.id)
              );

              if (validRemoteMovs.length > 0 || supMovs.length > 0) {
                const mappedMovs: Movimentacao[] = validRemoteMovs.map((row: any) => ({
                  id: row.id,
                  dataHora: row.data_hora,
                  itens: Array.isArray(row.itens) ? row.itens : [],
                  placaVeiculo: row.placa_veiculo,
                  modeloVeiculo: row.modelo_veiculo,
                  responsavel: row.responsavel,
                  updatedAt: row.updated_at || undefined,
                }));

                const remoteMovIds = new Set(mappedMovs.map((m) => m.id));
                const unsyncedMovs = localMovs.filter(
                  (l) => l.id && !remoteMovIds.has(l.id) && !deletedMovIds.has(l.id)
                );
                const mergedMovs = [...unsyncedMovs, ...mappedMovs];
                setMovimentacoes(mergedMovs);
                localStorage.setItem(MOV_STORAGE_KEY, JSON.stringify(mergedMovs));
                fetch('/api/store/movimentacoes', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ movimentacoes: mergedMovs }),
                }).catch(() => {});
              }
            }
          }
        } catch {
          // Supabase opcional
        }
      } catch {
        // Persistência local já carregada
      }
    };

    loadData();

    const intervalId = setInterval(() => {
      fetch('/api/store')
        .then((res) => (res.ok ? res.json() : null))
        .then(async (data) => {
          if (data && isMounted) {
            const deletedMovIds = getLocalDeletedSet(DELETED_MOV_KEY);
            if (Array.isArray(data.deletedMovimentacaoIds)) {
              let updated = false;
              data.deletedMovimentacaoIds.forEach((id: string) => {
                if (typeof id === 'string' && id.trim() && !deletedMovIds.has(id)) {
                  deletedMovIds.add(id);
                  updated = true;
                }
              });
              if (updated) saveLocalDeletedSet(DELETED_MOV_KEY, deletedMovIds);
            }

            if (Array.isArray(data.movimentacoes)) {
              const freshServerMovs: Movimentacao[] = data.movimentacoes.filter(
                (m: any) => m && m.id && !deletedMovIds.has(m.id)
              );
              setMovimentacoes((prev) => {
                const filteredPrev = prev.filter((m) => m && m.id && !deletedMovIds.has(m.id));
                const prevJson = JSON.stringify(filteredPrev);
                const serverIds = new Set(freshServerMovs.map((m) => m.id));
                const localOnly = filteredPrev.filter(
                  (m) => !serverIds.has(m.id) && !deletedMovIds.has(m.id)
                );
                const combined = [...freshServerMovs, ...localOnly];
                const newJson = JSON.stringify(combined);
                if (prevJson !== newJson) {
                  localStorage.setItem(MOV_STORAGE_KEY, JSON.stringify(combined));
                  return combined;
                }
                return filteredPrev;
              });
            }

            const deletedProdIds = getLocalDeletedSet(DELETED_PROD_KEY);
            if (Array.isArray(data.deletedProdutoIds)) {
              let updatedProdDel = false;
              data.deletedProdutoIds.forEach((id: string) => {
                if (typeof id === 'string' && id.trim() && !deletedProdIds.has(id)) {
                  deletedProdIds.add(id);
                  updatedProdDel = true;
                }
              });
              if (updatedProdDel) saveLocalDeletedSet(DELETED_PROD_KEY, deletedProdIds);
            }

            if (Array.isArray(data.produtos)) {
              const freshServerProds: Produto[] = data.produtos.filter(
                (p: any) => p && p.id && !deletedProdIds.has(p.id)
              );
              let localProds: Produto[] = [];
              try {
                const rawLocal = localStorage.getItem(PROD_STORAGE_KEY);
                if (rawLocal) {
                  const parsed = JSON.parse(rawLocal);
                  if (Array.isArray(parsed)) {
                    localProds = parsed.filter(
                      (p: Produto) => p && p.id && !deletedProdIds.has(p.id)
                    );
                  }
                }
              } catch {}

              setProdutosCadastrados((prev) => {
                const mergedPrevAndLocal = new Map<string, Produto>();
                prev.forEach((p) => {
                  if (p && p.id && !deletedProdIds.has(p.id)) {
                    mergedPrevAndLocal.set(p.id, p);
                  }
                });
                localProds.forEach((p) => {
                  if (p && p.id && !deletedProdIds.has(p.id)) {
                    mergedPrevAndLocal.set(p.id, p);
                  }
                });
                const filteredLocal = Array.from(mergedPrevAndLocal.values());
                const serverIds = new Set(freshServerProds.map((p) => p.id));
                const localOnly = filteredLocal.filter(
                  (p) => !serverIds.has(p.id) && !deletedProdIds.has(p.id)
                );
                const combined = [...freshServerProds, ...localOnly];
                const prevJson = JSON.stringify(prev);
                const newJson = JSON.stringify(combined);
                if (prevJson !== newJson) {
                  try {
                    localStorage.setItem(PROD_STORAGE_KEY, newJson);
                  } catch {}
                  return combined;
                }
                return prev;
              });
            }

            // Atualiza movimentações e produtos diretamente do Supabase
            try {
              const client = await getSupabaseClient();
              if (client && isMounted) {
                const [{ data: supMovs, error: movErr }, { data: supProds, error: prodErr }] =
                  await Promise.all([
                    client
                      .from('movimentacoes')
                      .select('*')
                      .order('data_hora', { ascending: false }),
                    client
                      .from('produtos')
                      .select('*')
                      .order('created_at', { ascending: false }),
                  ]);

                if (!movErr && Array.isArray(supMovs) && isMounted) {
                  const mappedMovs: Movimentacao[] = supMovs
                    .filter((row: any) => row && row.id && !deletedMovIds.has(row.id))
                    .map((row: any) => ({
                      id: row.id,
                      dataHora: row.data_hora,
                      itens: Array.isArray(row.itens) ? row.itens : [],
                      placaVeiculo: row.placa_veiculo,
                      modeloVeiculo: row.modelo_veiculo,
                      responsavel: row.responsavel,
                      updatedAt: row.updated_at || undefined,
                    }));

                  setMovimentacoes((prev) => {
                    const filteredPrev = prev.filter((m) => m && m.id && !deletedMovIds.has(m.id));
                    const remoteIds = new Set(mappedMovs.map((m) => m.id));
                    const localOnly = filteredPrev.filter(
                      (m) => !remoteIds.has(m.id) && !deletedMovIds.has(m.id)
                    );
                    const combined = [...localOnly, ...mappedMovs];
                    if (JSON.stringify(filteredPrev) !== JSON.stringify(combined)) {
                      localStorage.setItem(MOV_STORAGE_KEY, JSON.stringify(combined));
                      return combined;
                    }
                    return filteredPrev;
                  });
                }

                if (!prodErr && Array.isArray(supProds) && isMounted) {
                  const mappedProds: Produto[] = supProds
                    .filter((row: any) => row && row.id && !deletedProdIds.has(row.id))
                    .map((row: any) => ({
                      id: row.id,
                      codigo: row.codigo,
                      descricao: row.descricao,
                      createdAt: row.created_at || new Date().toISOString(),
                      updatedAt: row.updated_at || undefined,
                    }));

                  setProdutosCadastrados((prev) => {
                    const filteredPrev = prev.filter((p) => p && p.id && !deletedProdIds.has(p.id));
                    const remoteIds = new Set(mappedProds.map((p) => p.id));
                    const localOnly = filteredPrev.filter(
                      (p) => !remoteIds.has(p.id) && !deletedProdIds.has(p.id)
                    );
                    const combined = [...localOnly, ...mappedProds];
                    if (JSON.stringify(filteredPrev) !== JSON.stringify(combined)) {
                      try {
                        localStorage.setItem(PROD_STORAGE_KEY, JSON.stringify(combined));
                      } catch {}
                      return combined;
                    }
                    return filteredPrev;
                  });
                }
              }
            } catch {}
          }
        })
        .catch(() => {});
    }, 4000);

    const onFocus = () => {
      loadData();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    const deletedIds = getLocalDeletedSet(DELETED_MOV_KEY);
    const clean = movimentacoes.filter((m) => m && m.id && !deletedIds.has(m.id));
    localStorage.setItem(MOV_STORAGE_KEY, JSON.stringify(clean));
  }, [movimentacoes]);

  // Recarrega produtos atualizados do localStorage ao abrir o formulário
  const refreshLocalProducts = () => {
    try {
      const deletedIds = getLocalDeletedSet(DELETED_PROD_KEY);
      const raw = localStorage.getItem(PROD_STORAGE_KEY);
      if (raw) {
        const parsed: Produto[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const validLocal = parsed.filter((p) => p && p.id && !deletedIds.has(p.id));
          setProdutosCadastrados((prev) => {
            const localIds = new Set(validLocal.map((p) => p.id));
            const serverOnly = prev.filter(
              (p) => p && p.id && !deletedIds.has(p.id) && !localIds.has(p.id)
            );
            return [...validLocal, ...serverOnly];
          });
        }
      }
    } catch {}
  };

  const resetForm = () => {
    setProductSearchQuery('');
    setShowInlineSuggestions(false);
    setSelectedProduct(null);
    setItemQuantity('1');
    setItemError(null);
    setItensMovimentacao([]);
    setPlacaVeiculo('');
    setModeloVeiculo('');
    setResponsavel('');
    setFormErrors({});
  };

  const handleOpenCreate = () => {
    refreshLocalProducts();
    setEditingMov(null);
    resetForm();
    setViewMode('form');
  };

  const handleOpenEdit = (mov: Movimentacao) => {
    refreshLocalProducts();
    setEditingMov(mov);
    setProductSearchQuery('');
    setShowInlineSuggestions(false);
    setSelectedProduct(null);
    setItemQuantity('1');
    setItemError(null);
    setItensMovimentacao(mov.itens.map((item) => ({ ...item })));
    setPlacaVeiculo(mov.placaVeiculo);
    setModeloVeiculo(mov.modeloVeiculo);
    setResponsavel(mov.responsavel);
    setFormErrors({});
    setViewMode('form');
  };

  const handleCancelForm = () => {
    setViewMode('list');
    setEditingMov(null);
    resetForm();
  };

  // Produtos filtrados no campo de pesquisa inline
  const inlineMatchingProducts = useMemo(() => {
    const q = productSearchQuery.trim().toLowerCase();
    if (!q) return produtosCadastrados.slice(0, 8);
    return produtosCadastrados.filter(
      (p) => p.codigo.toLowerCase().includes(q) || p.descricao.toLowerCase().includes(q)
    );
  }, [productSearchQuery, produtosCadastrados]);

  // Produtos filtrados na Janela de Pesquisa de Produtos
  const modalMatchingProducts = useMemo(() => {
    const q = modalProductSearch.trim().toLowerCase();
    if (!q) return produtosCadastrados;
    return produtosCadastrados.filter(
      (p) => p.codigo.toLowerCase().includes(q) || p.descricao.toLowerCase().includes(q)
    );
  }, [modalProductSearch, produtosCadastrados]);

  const addProductItemToList = (prod: Produto, qtyNum: number) => {
    setItensMovimentacao((prev) => {
      const existingIndex = prev.findIndex((it) => it.produtoId === prod.id);
      if (existingIndex >= 0) {
        return prev.map((it, idx) =>
          idx === existingIndex ? { ...it, quantidade: it.quantidade + qtyNum } : it
        );
      }
      return [
        ...prev,
        {
          produtoId: prod.id,
          codigo: prod.codigo,
          descricao: prod.descricao,
          quantidade: qtyNum,
        },
      ];
    });
    setFormErrors((prev) => ({ ...prev, itens: undefined, general: undefined }));
  };

  const handleAddInlineProduct = () => {
    setItemError(null);

    if (!selectedProduct) {
      setItemError(
        'Selecione um produto cadastrado na lista de pesquisa. Produtos não cadastrados não são permitidos.'
      );
      return;
    }

    // Garante que o produto ainda existe na base de cadastrados
    const registered = produtosCadastrados.find((p) => p.id === selectedProduct.id);
    if (!registered) {
      setItemError('Produto não encontrado no Cadastro de Produtos.');
      return;
    }

    const parsedQty = Number(itemQuantity);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setItemError('Informe uma quantidade maior que zero.');
      return;
    }

    addProductItemToList(registered, parsedQty);
    setSelectedProduct(null);
    setProductSearchQuery('');
    setShowInlineSuggestions(false);
    setItemQuantity('1');
  };

  const handleOpenProductSearchModal = () => {
    refreshLocalProducts();
    setModalProductSearch('');
    setModalSelectedProduct(null);
    setModalQuantity('1');
    setModalError(null);
    setIsProductModalOpen(true);
  };

  const handleModalSelectOnly = (prod: Produto) => {
    setSelectedProduct(prod);
    setProductSearchQuery(`${prod.codigo} - ${prod.descricao}`);
    setShowInlineSuggestions(false);
    setItemError(null);
    setIsProductModalOpen(false);
  };

  const handleModalAddDirectly = () => {
    setModalError(null);
    if (!modalSelectedProduct) {
      setModalError('Selecione um produto da lista.');
      return;
    }
    const parsedQty = Number(modalQuantity);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setModalError('Informe uma quantidade maior que zero.');
      return;
    }
    addProductItemToList(modalSelectedProduct, parsedQty);
    setModalSelectedProduct(null);
    setModalQuantity('1');
    setIsProductModalOpen(false);
  };

  const handleUpdateItemQuantity = (produtoId: string, newVal: string) => {
    const parsed = Number(newVal);
    setItensMovimentacao((prev) =>
      prev.map((it) =>
        it.produtoId === produtoId
          ? { ...it, quantidade: Number.isFinite(parsed) ? parsed : 0 }
          : it
      )
    );
    setFormErrors((prev) => ({ ...prev, itens: undefined, general: undefined }));
  };

  const handleRemoveItem = (produtoId: string) => {
    setItensMovimentacao((prev) => prev.filter((it) => it.produtoId !== produtoId));
  };

  const handleSaveMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: typeof formErrors = {};
    if (itensMovimentacao.length === 0) {
      errors.itens = 'Adicione pelo menos um produto cadastrado à movimentação.';
    } else if (itensMovimentacao.some((it) => !Number.isFinite(it.quantidade) || it.quantidade <= 0)) {
      errors.itens = 'Todos os produtos devem possuir quantidade maior que zero.';
    }

    const cleanPlaca = placaVeiculo.trim().toUpperCase();
    const cleanModelo = modeloVeiculo.trim();
    const cleanResponsavel = responsavel.trim();

    if (!cleanPlaca) {
      errors.placaVeiculo = 'Informe a placa do veículo.';
    }
    if (!cleanModelo) {
      errors.modeloVeiculo = 'Informe o modelo do veículo.';
    }
    if (!cleanResponsavel) {
      errors.responsavel = 'Informe o responsável pela retirada.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors({
        ...errors,
        general: 'Verifique os campos obrigatórios antes de salvar a movimentação.',
      });
      return;
    }

    const now = new Date().toISOString();
    const movToSave: Movimentacao = editingMov
      ? {
          ...editingMov,
          itens: itensMovimentacao.map((it) => ({ ...it })),
          placaVeiculo: cleanPlaca,
          modeloVeiculo: cleanModelo,
          responsavel: cleanResponsavel,
          updatedAt: now,
        }
      : {
          id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          dataHora: now,
          itens: itensMovimentacao.map((it) => ({ ...it })),
          placaVeiculo: cleanPlaca,
          modeloVeiculo: cleanModelo,
          responsavel: cleanResponsavel,
          updatedAt: now,
        };

    const deletedIds = getLocalDeletedSet(DELETED_MOV_KEY);
    if (deletedIds.has(movToSave.id)) {
      deletedIds.delete(movToSave.id);
      saveLocalDeletedSet(DELETED_MOV_KEY, deletedIds);
    }

    setMovimentacoes((prev) => {
      const exists = prev.some((it) => it.id === movToSave.id);
      const updated = exists
        ? prev.map((it) => (it.id === movToSave.id ? movToSave : it))
        : [movToSave, ...prev];
      try {
        localStorage.setItem(MOV_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await fetch('/api/store/movimentacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movimentacao: movToSave }),
      });
    } catch (err) {
      console.error('Erro ao salvar movimentação no servidor:', err);
    }

    try {
      const client = supabase || (await getSupabaseClient());
      if (client) {
        await client.from('movimentacoes').upsert({
          id: movToSave.id,
          data_hora: movToSave.dataHora,
          itens: movToSave.itens,
          placa_veiculo: movToSave.placaVeiculo,
          modelo_veiculo: movToSave.modeloVeiculo,
          responsavel: movToSave.responsavel,
          updated_at: movToSave.updatedAt || now,
        });
      }
    } catch {
      // Supabase opcional
    }

    setViewMode('list');
    setEditingMov(null);
    resetForm();
    setFeedbackMessage(
      editingMov
        ? 'Movimentação atualizada com sucesso!'
        : 'Movimentação registrada com sucesso!'
    );
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleConfirmDelete = async () => {
    if (!deletingMov) return;
    const idToDelete = deletingMov.id;

    const deletedIds = getLocalDeletedSet(DELETED_MOV_KEY);
    deletedIds.add(idToDelete);
    saveLocalDeletedSet(DELETED_MOV_KEY, deletedIds);

    setMovimentacoes((prev) => {
      const updated = prev.filter((item) => item.id !== idToDelete);
      try {
        localStorage.setItem(MOV_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setDeletingMov(null);

    try {
      await fetch(`/api/store/movimentacoes/${encodeURIComponent(idToDelete)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idToDelete }),
      });
    } catch (err) {
      console.error('Erro ao excluir movimentação no servidor:', err);
    }

    try {
      await fetch('/api/store/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deletedMovimentacaoIds: [idToDelete],
        }),
      });
    } catch {}

    try {
      const client = supabase || (await getSupabaseClient());
      if (client) {
        await client.from('movimentacoes').delete().eq('id', idToDelete);
      }
    } catch {
      // Supabase opcional
    }

    setFeedbackMessage('Movimentação excluída com sucesso.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      filterResponsavel.trim() ||
      filterPlaca.trim() ||
      filterDataInicio ||
      filterDataFim
  );

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterResponsavel('');
    setFilterPlaca('');
    setFilterDataInicio('');
    setFilterDataFim('');
  };

  // Aplicação combinada ou independente de todos os filtros
  const filteredMovimentacoes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const resp = filterResponsavel.trim().toLowerCase();
    const placa = filterPlaca.trim().toLowerCase();

    return movimentacoes.filter((mov) => {
      if (q) {
        const matchesGeneral =
          mov.placaVeiculo.toLowerCase().includes(q) ||
          mov.modeloVeiculo.toLowerCase().includes(q) ||
          mov.responsavel.toLowerCase().includes(q) ||
          mov.itens.some(
            (it) =>
              it.codigo.toLowerCase().includes(q) || it.descricao.toLowerCase().includes(q)
          );
        if (!matchesGeneral) return false;
      }

      if (resp && !mov.responsavel.toLowerCase().includes(resp)) {
        return false;
      }

      if (placa && !mov.placaVeiculo.toLowerCase().includes(placa)) {
        return false;
      }

      if (filterDataInicio || filterDataFim) {
        const movYMD = getLocalDateYMD(mov.dataHora);
        if (!movYMD) return false;
        if (filterDataInicio && movYMD < filterDataInicio) return false;
        if (filterDataFim && movYMD > filterDataFim) return false;
      }

      return true;
    });
  }, [
    movimentacoes,
    searchTerm,
    filterResponsavel,
    filterPlaca,
    filterDataInicio,
    filterDataFim,
  ]);

  // =========================================================================
  // TELA DE CADASTRO / EDIÇÃO DE MOVIMENTAÇÃO
  // =========================================================================
  if (viewMode === 'form') {
    return (
      <div className="space-y-6 text-left">
        {/* Header da tela */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <span>{editingMov ? 'Editar Movimentação' : 'Nova Movimentação'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {editingMov
                ? 'Atualize os produtos, quantidades ou dados do veículo e responsável.'
                : 'Selecione os produtos cadastrados retirados e informe os dados do veículo e responsável.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveMovimentacao} className="space-y-6" noValidate>
          {formErrors.general && (
            <Alert
              type="error"
              onClose={() => setFormErrors((prev) => ({ ...prev, general: undefined }))}
            >
              {formErrors.general}
            </Alert>
          )}

          {/* 1.1. Identificação dos produtos & 1.2. Inclusão de múltiplos produtos */}
          <Card variant="glass" className="overflow-visible">
            <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50 rounded-t-2xl">
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-600" />
                <span>1. Identificação dos Produtos</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
              {itemError && (
                <Alert type="error" onClose={() => setItemError(null)}>
                  {itemError}
                </Alert>
              )}
              {formErrors.itens && (
                <Alert
                  type="error"
                  onClose={() => setFormErrors((prev) => ({ ...prev, itens: undefined }))}
                >
                  {formErrors.itens}
                </Alert>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                {/* Campo de pesquisa de produto cadastrado */}
                <div className="lg:col-span-7 relative">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Produto <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Pesquisar produto por código ou descrição..."
                        value={productSearchQuery}
                        onFocus={() => setShowInlineSuggestions(true)}
                        onChange={(e) => {
                          setProductSearchQuery(e.target.value);
                          setSelectedProduct(null);
                          setShowInlineSuggestions(true);
                          if (itemError) setItemError(null);
                        }}
                        className="w-full h-11 pl-9 pr-8 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      />
                      {productSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductSearchQuery('');
                            setSelectedProduct(null);
                            setShowInlineSuggestions(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                          title="Limpar seleção"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      {/* Dropdown de produtos cadastrados */}
                      {showInlineSuggestions && !selectedProduct && (
                        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                          {inlineMatchingProducts.length === 0 ? (
                            <div className="p-3 text-xs text-slate-500 text-center">
                              {produtosCadastrados.length === 0
                                ? 'Nenhum produto cadastrado no sistema. Cadastre produtos na aba "Cadastro de Produtos".'
                                : 'Nenhum produto cadastrado encontrado para essa pesquisa.'}
                            </div>
                          ) : (
                            inlineMatchingProducts.map((prod) => (
                              <button
                                key={prod.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProduct(prod);
                                  setProductSearchQuery(`${prod.codigo} - ${prod.descricao}`);
                                  setShowInlineSuggestions(false);
                                  setItemError(null);
                                }}
                                className="w-full px-3.5 py-2.5 text-left hover:bg-amber-50/70 transition-colors flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shrink-0">
                                    {prod.codigo}
                                  </span>
                                  <span className="text-xs sm:text-sm text-slate-800 font-medium truncate">
                                    {prod.descricao}
                                  </span>
                                </div>
                                <span className="text-[11px] text-amber-700 font-semibold shrink-0">
                                  Selecionar
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleOpenProductSearchModal}
                      leftIcon={<Search className="w-4 h-4" />}
                      className="h-11 shrink-0"
                    >
                      <span className="hidden sm:inline">Lista de Produtos</span>
                    </Button>
                  </div>
                </div>

                {/* Quantidade */}
                <div className="lg:col-span-2">
                  <Input
                    label="Quantidade"
                    type="number"
                    min="1"
                    step="1"
                    value={itemQuantity}
                    onChange={(e) => {
                      setItemQuantity(e.target.value);
                      if (itemError) setItemError(null);
                    }}
                    required
                  />
                </div>

                {/* Botão + Adicionar Produto */}
                <div className="lg:col-span-3">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddInlineProduct}
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="w-full h-11"
                  >
                    Adicionar Produto
                  </Button>
                </div>
              </div>

              {/* Exibição do produto selecionado (Código e Descrição) */}
              {selectedProduct && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-amber-800 bg-white border border-amber-300 px-2.5 py-1 rounded-md shrink-0">
                      {selectedProduct.codigo}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold">
                        Produto Selecionado
                      </p>
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {selectedProduct.descricao}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setProductSearchQuery('');
                    }}
                    className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors"
                    title="Remover seleção"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Lista/Tabela de produtos selecionados na movimentação */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Produtos Selecionados na Movimentação
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {itensMovimentacao.length} item(ns)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50/70 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Código</th>
                        <th className="py-3 px-4">Descrição do Produto</th>
                        <th className="py-3 px-4 w-36">Quantidade</th>
                        <th className="py-3 px-4 text-right w-28">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itensMovimentacao.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-500 text-xs">
                            Nenhum produto adicionado ainda. Pesquise e adicione produtos cadastrados acima.
                          </td>
                        </tr>
                      ) : (
                        itensMovimentacao.map((item) => (
                          <tr key={item.produtoId} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                                {item.codigo}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-800 font-medium">
                              {item.descricao}
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={item.quantidade || ''}
                                onChange={(e) =>
                                  handleUpdateItemQuantity(item.produtoId, e.target.value)
                                }
                                className={`w-24 h-9 px-2.5 rounded-lg border text-sm font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 ${
                                  item.quantidade <= 0
                                    ? 'border-red-500 focus:ring-red-500/20'
                                    : 'border-slate-300 focus:border-amber-500 focus:ring-amber-500/20'
                                }`}
                              />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.produtoId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remover</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 1.3. Identificação do veículo e responsável */}
          <Card variant="glass">
            <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-amber-600" />
                <span>2. Identificação do Veículo e Responsável</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Placa do Veículo"
                  placeholder="Ex: ABC-1D23"
                  value={placaVeiculo}
                  onChange={(e) => {
                    setPlacaVeiculo(e.target.value.toUpperCase());
                    if (formErrors.placaVeiculo) {
                      setFormErrors((prev) => ({
                        ...prev,
                        placaVeiculo: undefined,
                        general: undefined,
                      }));
                    }
                  }}
                  error={formErrors.placaVeiculo}
                  required
                />

                <Input
                  label="Modelo do Veículo"
                  placeholder="Ex: Sprinter 416 / VW Delivery"
                  value={modeloVeiculo}
                  onChange={(e) => {
                    setModeloVeiculo(e.target.value);
                    if (formErrors.modeloVeiculo) {
                      setFormErrors((prev) => ({
                        ...prev,
                        modeloVeiculo: undefined,
                        general: undefined,
                      }));
                    }
                  }}
                  error={formErrors.modeloVeiculo}
                  required
                />

                <Input
                  label="Responsável pela Retirada"
                  placeholder="Nome completo de quem está retirando"
                  value={responsavel}
                  onChange={(e) => {
                    setResponsavel(e.target.value);
                    if (formErrors.responsavel) {
                      setFormErrors((prev) => ({
                        ...prev,
                        responsavel: undefined,
                        general: undefined,
                      }));
                    }
                  }}
                  error={formErrors.responsavel}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* 1.4. Botões de ação na parte inferior */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleCancelForm}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              {editingMov ? 'Salvar' : 'Salvar Movimentação'}
            </Button>
          </div>
        </form>

        {/* Janela (Modal) de Pesquisa de Produtos */}
        <Modal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          title="Pesquisar Produtos Cadastrados"
          description="Pesquise pelo código ou descrição, selecione o produto e informe a quantidade."
          maxWidth="xl"
        >
          <div className="space-y-4">
            {modalError && (
              <Alert type="error" onClose={() => setModalError(null)}>
                {modalError}
              </Alert>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por código ou descrição do produto..."
                value={modalProductSearch}
                onChange={(e) => setModalProductSearch(e.target.value)}
                autoFocus
                className="w-full h-10 pl-9 pr-4 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Código</th>
                    <th className="py-2.5 px-4">Descrição do Produto</th>
                    <th className="py-2.5 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modalMatchingProducts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500 text-xs">
                        {produtosCadastrados.length === 0
                          ? 'Nenhum produto cadastrado. Cadastre primeiro em Gestão de Estoque > Cadastro de Produtos.'
                          : 'Nenhum produto encontrado para essa pesquisa.'}
                      </td>
                    </tr>
                  ) : (
                    modalMatchingProducts.map((prod) => {
                      const isSelected = modalSelectedProduct?.id === prod.id;
                      return (
                        <tr
                          key={prod.id}
                          onClick={() => {
                            setModalSelectedProduct(prod);
                            setModalError(null);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                            {prod.codigo}
                          </td>
                          <td className="py-2.5 px-4 text-slate-800">{prod.descricao}</td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleModalSelectOnly(prod);
                                }}
                                className="px-2.5 py-1 rounded-md text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                              >
                                Selecionar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {modalSelectedProduct && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-mono text-xs font-bold text-amber-800">
                      {modalSelectedProduct.codigo}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate mt-0.5">
                    {modalSelectedProduct.descricao}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs font-semibold text-slate-700">Qtd:</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={modalQuantity}
                    onChange={(e) => {
                      setModalQuantity(e.target.value);
                      if (modalError) setModalError(null);
                    }}
                    className="w-20 h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-sm font-mono font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleModalAddDirectly}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsProductModalOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // =========================================================================
  // TELA PRINCIPAL: BOTÃO + NOVA MOVIMENTAÇÃO, FILTROS E TABELA
  // =========================================================================
  return (
    <div className="space-y-6 text-left">
      {/* Header com botão "+ Nova Movimentação" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <span>Movimentações</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestão de Estoque · Registro e acompanhamento de retiradas de produtos.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreate}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Nova Movimentação
        </Button>
      </div>

      {feedbackMessage && (
        <Alert type="success" onClose={() => setFeedbackMessage(null)}>
          {feedbackMessage}
        </Alert>
      )}

      {/* 2 & 3. Campo de pesquisa e Filtros (Responsável, Placa do Veículo e Período) */}
      <Card variant="glass">
        <CardContent className="p-4 space-y-3">
          {/* Pesquisa geral */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Pesquisar movimentações por produto, código, modelo, placa ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
          </div>

          {/* Filtros independentes ou combinados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Responsável
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Nome do responsável"
                  value={filterResponsavel}
                  onChange={(e) => setFilterResponsavel(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Placa do Veículo
              </label>
              <div className="relative">
                <Car className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Ex: ABC-1D23"
                  value={filterPlaca}
                  onChange={(e) => setFilterPlaca(e.target.value.toUpperCase())}
                  className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Data Inicial
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={filterDataInicio}
                  onChange={(e) => setFilterDataInicio(e.target.value)}
                  className="w-full h-9 pl-8 pr-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Data Final
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={filterDataFim}
                  onChange={(e) => setFilterDataFim(e.target.value)}
                  className="w-full h-9 pl-8 pr-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center">
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  leftIcon={<FilterX className="w-3.5 h-3.5" />}
                  className="w-full h-9 text-xs text-slate-600 hover:text-slate-900 border border-slate-200"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Movimentações */}
      <Card variant="glass" className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg text-slate-900">
              Histórico de Movimentações
            </CardTitle>
            <span className="text-xs text-slate-500 font-mono">
              {filteredMovimentacoes.length} registro(s)
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 sm:px-5">Data e Hora</th>
                  <th className="py-3.5 px-4 sm:px-5">Produtos Movimentados</th>
                  <th className="py-3.5 px-4 sm:px-5">Placa do Veículo</th>
                  <th className="py-3.5 px-4 sm:px-5">Modelo do Veículo</th>
                  <th className="py-3.5 px-4 sm:px-5">Responsável</th>
                  <th className="py-3.5 px-4 sm:px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      {hasActiveFilters
                        ? 'Nenhuma movimentação encontrada para os filtros aplicados.'
                        : 'Nenhuma movimentação registrada. Clique em "+ Nova Movimentação".'}
                    </td>
                  </tr>
                ) : (
                  filteredMovimentacoes.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors align-top">
                      {/* Data e Hora */}
                      <td className="py-3.5 px-4 sm:px-5 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {formatDateTimeBR(mov.dataHora)}
                      </td>

                      {/* Produtos Movimentados */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="space-y-1.5">
                          {mov.itens.map((item, idx) => (
                            <div
                              key={`${mov.id}-${item.produtoId}-${idx}`}
                              className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5"
                            >
                              <span className="font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                                {item.codigo}
                              </span>
                              <span className="text-slate-800 font-medium flex-1 min-w-0 break-words">
                                {item.descricao}
                              </span>
                              <span className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded shrink-0">
                                Qtd: {item.quantidade}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Placa do Veículo */}
                      <td className="py-3.5 px-4 sm:px-5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs">
                          <Hash className="w-3 h-3 text-slate-500" />
                          <span>{mov.placaVeiculo}</span>
                        </span>
                      </td>

                      {/* Modelo do Veículo */}
                      <td className="py-3.5 px-4 sm:px-5 text-slate-800 font-medium">
                        {mov.modeloVeiculo}
                      </td>

                      {/* Responsável */}
                      <td className="py-3.5 px-4 sm:px-5 text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{mov.responsavel}</span>
                        </div>
                      </td>

                      {/* Ações: Editar / Excluir */}
                      <td className="py-3.5 px-4 sm:px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(mov)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs"
                            title="Editar movimentação"
                            aria-label="Editar movimentação"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span className="hidden md:inline font-medium">Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingMov(mov)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1 text-xs"
                            title="Excluir movimentação"
                            aria-label="Excluir movimentação"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden md:inline font-medium">Excluir</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={Boolean(deletingMov)}
        onClose={() => setDeletingMov(null)}
        title="Excluir Movimentação"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Tem certeza de que deseja excluir esta movimentação? Essa ação não poderá ser desfeita.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setDeletingMov(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmDelete}>
              Confirmar exclusão
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
