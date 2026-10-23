// Capa de um imóvel ou lançamento: a primeira foto cadastrada, depois uma capa alternativa
// (a do projeto da Academia, ligada pelo nome) e, por fim, um degradê na cor dele.
export function estiloCapa(cor, fotos, alternativa) {
  const c = cor || "#0284C7";
  const foto = fotos?.[0] ?? alternativa;
  if (foto) return { background: `center / cover no-repeat url("${String(foto).replace(/"/g, "%22")}")`, backgroundColor: c };
  return { background: `linear-gradient(135deg, ${c}, ${c}bb)` };
}
