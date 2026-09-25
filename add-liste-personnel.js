const fs = require('fs');
let content = fs.readFileSync('src/lib/ia/outils.ts', 'utf8');

const newTool = `
    {
      nom: 'liste_tous_personnels',
      description: "Retourne la liste globale de tout le personnel (enseignants, surveillants, direction, etc.). Très utile quand on demande 'liste moi tous les enseignants'.",
      permission: ['rh.gerer', 'eleves.lire'],
      parametres: { type: 'object', properties: { role: { type: 'string', description: 'Optionnel: filtre par rôle (ex: enseignant)' } } },
      executer: async (ctx, args) => {
        let where = { ecoleId: ctx.ecoleId, deletedAt: null };
        if (args.role) {
          where.roles = { some: { role: { code: String(args.role) } } };
        }
        const personnels = await db.personnel.findMany({
          where,
          include: { roles: { include: { role: true } } },
          orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
          take: 100
        });
        return {
          totalFiltre: personnels.length,
          personnels: personnels.map(p => ({
            id: p.id, matricule: p.matricule, nom: p.nom, prenom: p.prenom,
            roles: p.roles.map(r => r.role.libelle).join(', '), statut: p.statut
          }))
        };
      }
    },`;

if (!content.includes('nom: \'liste_tous_personnels\'')) {
  // Find where liste_tous_eleves is to put it nearby, or just put it in outilsLecture array
  const insertionRegex = /(const outilsLecture: OutilIA\[\] = \[\s*)\{/g;
  content = content.replace(insertionRegex, `$1${newTool}\n    {`);
  fs.writeFileSync('src/lib/ia/outils.ts', content, 'utf8');
  console.log('liste_tous_personnels Tool added!');
} else {
  console.log('Tool already exists!');
}
