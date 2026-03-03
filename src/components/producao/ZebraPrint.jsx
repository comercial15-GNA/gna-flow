/**
 * Impressão via Zebra BrowserPrint
 * Requer o app Zebra BrowserPrint instalado no PC.
 * Documentação: https://www.zebra.com/us/en/software/zebra-technology-software/browser-print.html
 *
 * Etiqueta configurada para 100mm x 50mm (ZPL)
 */

const BROWSER_PRINT_URL = 'http://localhost:9100';

/**
 * Busca a impressora padrão configurada no BrowserPrint
 */
async function getDefaultPrinter() {
  const response = await fetch(`${BROWSER_PRINT_URL}/default?type=device`, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error('Não foi possível conectar ao Zebra BrowserPrint. Verifique se o app está instalado e em execução.');
  }
  const data = await response.json();
  if (!data || !data.uid) {
    throw new Error('Nenhuma impressora Zebra encontrada. Configure a impressora padrão no BrowserPrint.');
  }
  return data;
}

/**
 * Envia ZPL para a impressora
 */
async function sendZPL(printer, zpl) {
  const response = await fetch(`${BROWSER_PRINT_URL}/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device: printer,
      data: zpl,
    }),
  });
  if (!response.ok) {
    throw new Error('Erro ao enviar dados para a impressora.');
  }
}

/**
 * Gera ZPL para etiqueta 100x50mm com dados do item da OP
 * Zebra ZD220 - DPI 203
 * 100mm = 800 dots, 50mm = 400 dots
 */
function gerarZPL(item) {
  const truncate = (str, max) => {
    if (!str) return '-';
    return str.length > max ? str.substring(0, max - 1) + '.' : str;
  };

  const numeroOP = item.numero_op || '-';
  const descricao = truncate(item.descricao, 40);
  const codigoGA = item.codigo_ga || '-';
  const equipamento = truncate(item.equipamento_principal || item.equipamento || '-', 35);
  const peso = item.peso ? `${item.peso} kg` : '-';
  const quantidade = item.quantidade || '-';

  // ZPL para 100x50mm @ 203dpi
  // ^PW800 = 100mm * 8dots/mm
  // ^LL400 = 50mm * 8dots/mm
  const zpl = `
^XA
^PW800
^LL400
^CI28

^FO20,15^GB760,0,2^FS

^FO20,25^A0N,28,28^FD${numeroOP}^FS
^FO550,20^BQN,2,4^FDQA,${numeroOP}^FS

^FO20,65^GB760,0,1^FS

^FO20,78^A0N,20,20^FDDescricao:^FS
^FO20,100^A0N,22,22^FD${descricao}^FS

^FO20,130^GB760,0,1^FS

^FO20,143^A0N,20,20^FDCod. GA: ^FS
^FO175,143^A0N,20,20^FD${codigoGA}^FS

^FO450,143^A0N,20,20^FDPeso:^FS
^FO540,143^A0N,20,20^FD${peso}^FS

^FO20,173^GB760,0,1^FS

^FO20,185^A0N,20,20^FDEquipamento:^FS
^FO20,207^A0N,20,20^FD${equipamento}^FS

^FO20,237^GB760,0,1^FS

^FO20,250^A0N,20,20^FDQtd: ${quantidade}^FS

^FO20,280^GB760,0,2^FS

^XZ
`.trim();

  return zpl;
}

/**
 * Função principal: imprime etiqueta do item
 */
export async function imprimirEtiqueta(item) {
  const printer = await getDefaultPrinter();
  const zpl = gerarZPL(item);
  await sendZPL(printer, zpl);
}