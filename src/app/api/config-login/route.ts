// F2 — le client demande si la liste des comptes démo peut être affichée.
// Décision SERVEUR uniquement : développement ou flag SG_AFFICHER_COMPTES_DEMO.
// En production sans flag : { demo: false } — aucun indice public.
export async function GET() {
  const autorise =
    process.env.NODE_ENV === 'development' ||
    process.env.SG_AFFICHER_COMPTES_DEMO === '1';
  return Response.json(
    { demo: autorise },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
