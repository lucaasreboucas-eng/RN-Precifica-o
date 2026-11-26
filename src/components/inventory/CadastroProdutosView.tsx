import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Hash } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import type { Produto } from '../../types/estoque';
import { supabase, getSupabaseClient } from '../../lib/supabase';

const STORAGE_KEY = 'rn_precificacao_produtos_prod_v1';
const DELETED_IDS_KEY = 'rn_precificacao_deleted_produtos_v1';

const getLocalDeletedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((id) => typeof id === 'string' && id.trim().length > 0));
      }
    }
  } catch {}
  return new Set<string>();
};

const saveLocalDeletedIds = (ids: Set<string> | string[]) => {
  try {
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
};

export const CadastroProdutosView: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>(() => {
    try {
      const deletedIds = getLocalDeletedIds();
      const saved = localStorage.getItem(STORAGE_KEY);
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

  // Modal de Cadastro / Edição
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    codigo?: string;
    descricao?: string;
    general?: string;
  }>({});

  // Modal de Exclusão
  const [deletingProduto, setDeletingProduto] = useState<Produto | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProdutos = async () => {
      try {
        const deletedIds = getLocalDeletedIds();
        let localProdutos: Produto[] = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              localProdutos = parsed.filter((p: Produto) => p && p.id && !deletedIds.has(p.id));
            }
          }
        } catch {
          localProdutos = [];
        }

        const syncRes = await fetch('/api/store/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            produtos: localProdutos,
            deletedProdutoIds: Array.from(deletedIds),
          }),
        });

        if (syncRes.ok && isMounted) {
          const storeData = await syncRes.json();

          if (Array.isArray(storeData.deletedProdutoIds)) {
            let updated = false;
            storeData.deletedProdutoIds.forEach((id: string) => {
              if (typeof id === 'string' && id.trim() && !deletedIds.has(id)) {
                deletedIds.add(id);
                updated = true;
              }
            });
            if (updated) {
              saveLocalDeletedIds(deletedIds);
            }
          }

          if (Array.isArray(storeData.produtos)) {
            const validServerProdutos: Produto[] = storeData.produtos.filter(
              (p: any) => p && p.id && !deletedIds.has(p.id)
            );
            const serverIds = new Set(validServerProdutos.map((p) => p.id));
            const missingOnServer = localProdutos.filter(
              (l) => !serverIds.has(l.id) && !deletedIds.has(l.id)
            );
            const merged = [...validServerProdutos, ...missingOnServer];
            setProdutos(merged);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            localProdutos = merged;
          }
        }

        // Sincroniza com Supabase
        try {
          const client = await getSupabaseClient();
          if (client) {
            const { data, error } = await client
              .from('produtos')
              .select('*')
              .order('created_at', { ascending: false });

            if (!error && Array.isArray(data) && isMounted) {
              data.forEach((row: any) => {
                if (row && row.id && deletedIds.has(row.id)) {
                  Promise.resolve(client.from('produtos').delete().eq('id', row.id)).catch(() => {});
                }
              });

              const validRemoteRows = data.filter(
                (row: any) => row && row.id && !deletedIds.has(row.id)
              );

              if (validRemoteRows.length > 0 || data.length > 0) {
                const mappedRemote: Produto[] = validRemoteRows.map((row: any) => ({
                  id: row.id,
                  codigo: row.codigo,
                  descricao: row.descricao,
                  createdAt: row.created_at || new Date().toISOString(),
                  updatedAt: row.updated_at || undefined,
                }));

                const remoteIds = new Set(mappedRemote.map((p) => p.id));
                const unsyncedLocal = localProdutos.filter(
                  (l) => l.id && !remoteIds.has(l.id) && !deletedIds.has(l.id)
                );
                const merged = [...unsyncedLocal, ...mappedRemote];
                setProdutos(merged);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                fetch('/api/store/produtos', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ produtos: merged }),
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

    loadProdutos();

    const intervalId = setInterval(() => {
      fetch('/api/store')
        .then((res) => (res.ok ? res.json() : null))
        .then(async (data) => {
          if (data && isMounted) {
            const deletedIds = getLocalDeletedIds();
            if (Array.isArray(data.deletedProdutoIds)) {
              let updated = false;
              data.deletedProdutoIds.forEach((id: string) => {
                if (typeof id === 'string' && id.trim() && !deletedIds.has(id)) {
                  deletedIds.add(id);
                  updated = true;
                }
              });
              if (updated) {
                saveLocalDeletedIds(deletedIds);
              }
            }

            if (Array.isArray(data.produtos)) {
              const freshServerProdutos: Produto[] = data.produtos.filter(
                (p: any) => p && p.id && !deletedIds.has(p.id)
              );
              setProdutos((prev) => {
                const filteredPrev = prev.filter((p) => p && p.id && !deletedIds.has(p.id));
                const prevJson = JSON.stringify(filteredPrev);
                const serverIds = new Set(freshServerProdutos.map((p) => p.id));
                const localOnly = filteredPrev.filter(
                  (p) => !serverIds.has(p.id) && !deletedIds.has(p.id)
                );
                const combined = [...freshServerProdutos, ...localOnly];
                const newJson = JSON.stringify(combined);
                if (prevJson !== newJson) {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
                  return combined;
                }
                return filteredPrev;
              });
            }

            // Atualiza também a partir do Supabase
            try {
              const client = await getSupabaseClient();
              if (client && isMounted) {
                const { data: remoteRows, error } = await client
                  .from('produtos')
                  .select('*')
                  .order('created_at', { ascending: false });

                if (!error && Array.isArray(remoteRows) && isMounted) {
                  const mappedRemote: Produto[] = remoteRows
                    .filter((row: any) => row && row.id && !deletedIds.has(row.id))
                    .map((row: any) => ({
                      id: row.id,
                      codigo: row.codigo,
                      descricao: row.descricao,
                      createdAt: row.created_at || new Date().toISOString(),
                      updatedAt: row.updated_at || undefined,
                    }));

                  setProdutos((prev) => {
                    const filteredPrev = prev.filter((p) => p && p.id && !deletedIds.has(p.id));
                    const remoteIds = new Set(mappedRemote.map((p) => p.id));
                    const localOnly = filteredPrev.filter(
                      (p) => !remoteIds.has(p.id) && !deletedIds.has(p.id)
                    );
                    const combined = [...localOnly, ...mappedRemote];
                    if (JSON.stringify(filteredPrev) !== JSON.stringify(combined)) {
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
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
      loadProdutos();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    const deletedIds = getLocalDeletedIds();
    const clean = produtos.filter((p) => p && p.id && !deletedIds.has(p.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  }, [produtos]);

  const handleOpenCreateModal = () => {
    setEditingProduto(null);
    setCodigo('');
    setDescricao('');
    setFieldErrors({});
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (produto: Produto) => {
    setEditingProduto(produto);
    setCodigo(produto.codigo);
    setDescricao(produto.descricao);
    setFieldErrors({});
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingProduto(null);
    setCodigo('');
    setDescricao('');
    setFieldErrors({});
  };

  const handleSaveProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCodigo = codigo.trim();
    const trimmedDescricao = descricao.trim();

    const errors: { codigo?: string; descricao?: string; general?: string } = {};
    if (!trimmedCodigo) {
      errors.codigo = 'Informe o código do produto.';
    }
    if (!trimmedDescricao) {
      errors.descricao = 'Informe a descrição do produto.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors({
        ...errors,
        general: 'Preencha todos os campos obrigatórios antes de salvar.',
      });
      return;
    }

    const now = new Date().toISOString();
    const produtoToSave: Produto = editingProduto
      ? {
          ...editingProduto,
          codigo: trimmedCodigo,
          descricao: trimmedDescricao,
          updatedAt: now,
        }
      : {
          id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          codigo: trimmedCodigo,
          descricao: trimmedDescricao,
          createdAt: now,
          updatedAt: now,
        };

    const deletedIds = getLocalDeletedIds();
    if (deletedIds.has(produtoToSave.id)) {
      deletedIds.delete(produtoToSave.id);
      saveLocalDeletedIds(deletedIds);
    }

    setProdutos((prev) => {
      const exists = prev.some((it) => it.id === produtoToSave.id);
      const updated = exists
        ? prev.map((it) => (it.id === produtoToSave.id ? produtoToSave : it))
        : [produtoToSave, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    handleCloseFormModal();

    try {
      await fetch('/api/store/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produto: produtoToSave }),
      });
    } catch (err) {
      console.error('Erro ao salvar produto no servidor:', err);
    }

    try {
      const client = supabase || (await getSupabaseClient());
      if (client) {
        await client.from('produtos').upsert({
          id: produtoToSave.id,
          codigo: produtoToSave.codigo,
          descricao: produtoToSave.descricao,
          created_at: produtoToSave.createdAt || now,
          updated_at: produtoToSave.updatedAt || now,
        });
      }
    } catch {
      // Supabase opcional
    }

    setFeedbackMessage(
      editingProduto
        ? `Produto "${produtoToSave.descricao}" atualizado com sucesso!`
        : `Produto "${produtoToSave.descricao}" cadastrado com sucesso!`
    );
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduto) return;
    const idToDelete = deletingProduto.id;

    const deletedIds = getLocalDeletedIds();
    deletedIds.add(idToDelete);
    saveLocalDeletedIds(deletedIds);

    setProdutos((prev) => {
      const updated = prev.filter((item) => item.id !== idToDelete);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setDeletingProduto(null);

    try {
      await fetch(`/api/store/produtos/${encodeURIComponent(idToDelete)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idToDelete }),
      });
    } catch (err) {
      console.error('Erro ao excluir produto no servidor:', err);
    }

    try {
      await fetch('/api/store/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deletedProdutoIds: [idToDelete],
        }),
      });
    } catch {}

    try {
      const client = supabase || (await getSupabaseClient());
      if (client) {
        await client.from('produtos').delete().eq('id', idToDelete);
      }
    } catch {
      // Supabase opcional
    }

    setFeedbackMessage('Produto excluído com sucesso.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header com botão "+ Novo Produto" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Package className="w-5 h-5" />
            </div>
            <span>Cadastro de Produtos</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestão de Estoque · Registro e manutenção do catálogo de produtos.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreateModal}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Novo Produto
        </Button>
      </div>

      {feedbackMessage && (
        <Alert type="success" onClose={() => setFeedbackMessage(null)}>
          {feedbackMessage}
        </Alert>
      )}

      {/* Tabela de Produtos Cadastrados */}
      <Card variant="glass" className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg text-slate-900">
              Produtos Cadastrados
            </CardTitle>
            <span className="text-xs text-slate-500 font-mono">
              {produtos.length} registro(s)
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Código do Produto</th>
                  <th className="py-3.5 px-4 sm:px-6">Descrição do Produto</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500">
                      Nenhum produto cadastrado. Clique em &quot;+ Novo Produto&quot;.
                    </td>
                  </tr>
                ) : (
                  produtos.map((produto) => (
                    <tr
                      key={produto.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Código do Produto */}
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                            <Hash className="w-3.5 h-3.5" />
                          </span>
                          <span>{produto.codigo}</span>
                        </div>
                      </td>

                      {/* Descrição do Produto */}
                      <td className="py-3.5 px-4 sm:px-6 text-slate-800 font-medium">
                        {produto.descricao}
                      </td>

                      {/* Ações: Editar / Excluir */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(produto)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs"
                            title="Editar produto"
                            aria-label="Editar produto"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span className="hidden md:inline font-medium">Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingProduto(produto)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1 text-xs"
                            title="Excluir produto"
                            aria-label="Excluir produto"
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

      {/* Modal de Cadastro / Edição de Produto */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        title={editingProduto ? 'Editar Produto' : 'Novo Produto'}
        description={
          editingProduto
            ? 'Altere as informações do produto selecionado.'
            : 'Preencha os campos abaixo para cadastrar um novo produto.'
        }
        maxWidth="md"
      >
        <form onSubmit={handleSaveProduto} className="space-y-4" noValidate>
          {fieldErrors.general && (
            <Alert
              type="error"
              onClose={() => setFieldErrors((prev) => ({ ...prev, general: undefined }))}
            >
              {fieldErrors.general}
            </Alert>
          )}

          <Input
            label="Código do Produto"
            placeholder="Ex: PRD-001"
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value);
              if (fieldErrors.codigo) {
                setFieldErrors((prev) => ({ ...prev, codigo: undefined, general: undefined }));
              }
            }}
            error={fieldErrors.codigo}
            required
          />

          <Input
            label="Descrição do Produto"
            placeholder="Informe o nome ou a descrição do produto"
            value={descricao}
            onChange={(e) => {
              setDescricao(e.target.value);
              if (fieldErrors.descricao) {
                setFieldErrors((prev) => ({ ...prev, descricao: undefined, general: undefined }));
              }
            }}
            error={fieldErrors.descricao}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={handleCloseFormModal}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal
        isOpen={Boolean(deletingProduto)}
        onClose={() => setDeletingProduto(null)}
        title="Excluir Produto"
        description="Confirmar a exclusão do produto."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Deseja realmente excluir o produto{' '}
            <strong className="text-amber-700 font-mono">
              {deletingProduto?.codigo}
            </strong>{' '}
            —{' '}
            <strong className="text-slate-900">
              {deletingProduto?.descricao}
            </strong>
            ? Esta ação é irreversível.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingProduto(null)}
            >
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmDelete}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
