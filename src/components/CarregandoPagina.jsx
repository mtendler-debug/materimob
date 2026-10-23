// Enquanto o arquivo de uma página chega (ver lib/lazyPagina.js). Mesmo
// "Carregando…" discreto das outras telas; dentro do app, só a área de
// conteúdo espera — o menu fica.
export function CarregandoPagina({ telaCheia = true }) {
  return (
    <div className={`flex items-center justify-center bg-bg ${telaCheia ? "min-h-screen" : "min-h-[50vh]"}`}>
      <p className="text-sm text-muted">Carregando…</p>
    </div>
  );
}
