import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { gerarZPL, imprimirViaBrowserPrint } from '@/components/producao/ImprimirEtiquetaZebra';

const FORM_INICIAL = { descricao: '', codigo_ga: '', equipamento: '', peso: '' };

export default function EtiquetaPersonalizadaTab() {
  const [form, setForm] = useState(FORM_INICIAL);
  const [loading, setLoading] = useState(false);

  const alterar = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const imprimir = async () => {
    if (!form.descricao.trim()) {
      toast.error('Informe a descrição do item');
      return;
    }

    setLoading(true);
    try {
      await imprimirViaBrowserPrint(gerarZPL({
        numero_op: 'IDENTIFICAÇÃO',
        descricao: form.descricao.trim(),
        codigo_ga: form.codigo_ga.trim(),
        equipamento_principal: form.equipamento.trim(),
        peso: form.peso ? Number(form.peso) : null,
      }));
      toast.success('Etiqueta enviada para impressão!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Erro ao imprimir etiqueta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6 max-w-2xl">
      <p className="text-sm text-slate-500 mb-6">
        Use esta opção para identificar peças sem OP cadastrada. O campo da ordem exibirá "IDENTIFICAÇÃO".
      </p>

      <div className="space-y-4">
        <div>
          <Label>Descrição do item *</Label>
          <Input
            value={form.descricao}
            onChange={(e) => alterar('descricao', e.target.value)}
            placeholder="Ex: Tampa de inspeção 300mm"
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Código GA</Label>
            <Input
              value={form.codigo_ga}
              onChange={(e) => alterar('codigo_ga', e.target.value)}
              placeholder="Ex: GA-12345"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Peso (kg) - opcional</Label>
            <Input
              type="number"
              step="0.01"
              value={form.peso}
              onChange={(e) => alterar('peso', e.target.value)}
              placeholder="Ex: 12.5"
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label>Equipamento</Label>
          <Input
            value={form.equipamento}
            onChange={(e) => alterar('equipamento', e.target.value)}
            placeholder="Ex: Secador Rotativo"
            className="mt-1"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => setForm(FORM_INICIAL)} disabled={loading}>
            Limpar
          </Button>
          <Button type="button" onClick={imprimir} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Printer className="w-4 h-4 mr-2" />
            )}
            Imprimir etiqueta
          </Button>
        </div>
      </div>
    </div>
  );
}