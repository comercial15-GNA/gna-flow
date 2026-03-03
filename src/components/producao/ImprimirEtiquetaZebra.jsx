import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function gerarZPL(item) {
  const numeroOP = (item.numero_op || '-');
  const descricao = (item.descricao || '-').substring(0, 45);
  const codigoGA = item.codigo_ga || '-';
  const equipamento = (item.equipamento_principal || '-').substring(0, 20);
  const peso = item.peso ? `${item.peso}` : '-';

  const agora = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dataHora = `${pad(agora.getDate())}/${pad(agora.getMonth()+1)}/${agora.getFullYear()} ${pad(agora.getHours())}:${pad(agora.getMinutes())}:${pad(agora.getSeconds())}`;

  return `^XA
^CI28
^MMT
^PW794
^LL397
^LS0

^FO10,10^GB774,377,4^FS

^FO10,10^GB374,100,4^FS

^FO384,10^GB400,100,4^FS
^FO394,22^A0N,48,52^FD${numeroOP}^FS

^FO10,110^GB774,4,4^FS
^FO10,110^GB774,160,4^FS
^FO20,125^A0N,42,44^FD${descricao}^FS

^FO10,270^GB774,4,4^FS
^FO10,270^GB254,70,4^FS
^FO270,270^GB254,70,4^FS
^FO524,270^GB260,70,4^FS

^FO20,285^A0N,35,36^FD${equipamento}^FS
^FO280,285^A0N,35,36^FD${codigoGA}^FS
^FO535,285^A0N,35,36^FDPeso:${peso}^FS

^FO10,340^GB774,4,4^FS
^FO20,350^A0N,28,28^FDImpresso: ${dataHora}^FS

^XZ`;
}

async function imprimirViaBrowserPrint(zpl) {
  const BROWSERPRINT_URL = 'http://localhost:9100';

  const deviceRes = await fetch(`${BROWSERPRINT_URL}/available`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!deviceRes.ok) {
    throw new Error('Zebra BrowserPrint não encontrado. Verifique se o aplicativo está instalado e em execução.');
  }

  const deviceData = await deviceRes.json();
  const impressoras = deviceData?.printer;

  if (!impressoras || impressoras.length === 0) {
    throw new Error('Nenhuma impressora Zebra encontrada. Verifique a conexão da impressora.');
  }

  const impressora = Array.isArray(impressoras) ? impressoras[0] : impressoras;

  const printRes = await fetch(`${BROWSERPRINT_URL}/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device: impressora,
      data: zpl,
    }),
  });

  if (!printRes.ok) {
    throw new Error('Erro ao enviar dados para a impressora.');
  }
}

export default function ImprimirEtiquetaZebra({ item }) {
  const [loading, setLoading] = useState(false);

  const handleImprimir = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const zpl = gerarZPL(item);
      await imprimirViaBrowserPrint(zpl);
      toast.success('Etiqueta enviada para impressão!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Erro ao imprimir etiqueta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleImprimir}
      disabled={loading}
      className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 border-slate-200"
      title="Imprimir etiqueta Zebra"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      ) : (
        <Printer className="w-3 h-3 mr-1" />
      )}
      Etiqueta
    </Button>
  );
}