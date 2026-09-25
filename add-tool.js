const fs = require('fs');
let content = fs.readFileSync('src/lib/ia/outils.ts', 'utf8');

const newTool = `
    {
      nom: 'inscrire_personnel',
      description: "Enregistre un nouvel employé ou enseignant (personnel) dans l'établissement. Ne JAMAIS utiliser inscrire_eleve pour un enseignant.",
      permission: 'rh.gerer',
      parametres: P({
        nom: { type: 'string', description: 'Nom de famille' },
        prenom: { type: 'string', description: 'Prénom' },
        email: { type: 'string', description: 'Email (optionnel, permet de créer un compte)' },
        telephone: { type: 'string', description: 'Téléphone (optionnel)' },
        dateEmbauche: { type: 'string', description: 'Date ISO AAAA-MM-JJ' },
        typeContrat: { type: 'string', description: 'Type', enum: ['CDI', 'CDD', 'vacataire', 'stagiaire'] },
        salaireMensuel: { type: 'number', description: 'Salaire brut mensuel en FCFA (optionnel)' },
        roleCode: { type: 'string', description: 'Rôle métier', enum: ['enseignant', 'surveillant', 'secretaire', 'comptabilite', 'rh', 'direction'] },
      }, ['nom', 'prenom', 'dateEmbauche', 'roleCode']),
      executer: async (ctx, args) => {
        return biz.creerPersonnelCore(ctx as never, ctx.ecoleId!, {
          nom: String(args.nom),
          prenom: String(args.prenom),
          email: args.email ? String(args.email) : undefined,
          telephone: args.telephone ? String(args.telephone) : undefined,
          dateEmbauche: new Date(String(args.dateEmbauche)),
          typeContrat: args.typeContrat ? String(args.typeContrat) : undefined,
          salaireBrut: args.salaireMensuel ? Math.round(Number(args.salaireMensuel) * 100) : undefined,
          roleCode: String(args.roleCode),
          creerCompte: !!args.email,
          motDePasseInitial: args.email ? 'Scola' + new Date().getFullYear() + '!' : undefined,
        } as never);
      },
    },`;

if (!content.includes('nom: \'inscrire_personnel\'')) {
  // Find where inscrire_eleve ends
  const inscrireEleveRegex = /(nom:\s*'inscrire_eleve'[\s\S]*?\},)\s*\{/g;
  content = content.replace(inscrireEleveRegex, `$1${newTool}\n    {`);
  fs.writeFileSync('src/lib/ia/outils.ts', content, 'utf8');
  console.log('Tool added!');
} else {
  console.log('Tool already exists!');
}
