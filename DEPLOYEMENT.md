# 🚀 Guide de déploiement — ScolaGestion dans une école réelle

Ce guide couvre l'installation complète, de la location du serveur à la rentrée.
Chaque commande a été validée sur le projet (Node 20+, npm).

---

## 1. Ce qu'il vous faut

| Élément | Recommandation | Coût indicatif |
|---|---|---|
| Serveur (VPS) | 2 vCPU, 2 Go RAM, 20 Go disque (suffit pour 1 école de 1 000+ élèves) | ~5-10 €/mois |
| Nom de domaine | ex. `gestion.monecole.sn` | ~10 €/an |
| Fournisseur email (recommandé) | Brevo (300 emails/jour gratuits) | gratuit au début |
| Fournisseur SMS (optionnel) | Orange API / Twilio / tout relais HTTP | à l'usage |

---

## 2. Installation du serveur (une fois)

```bash
# 2.1 Se connecter au serveur et installer Node 20 + Caddy
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs caddy git

# 2.2 Copier le projet (git clone, scp, ou archive)
sudo mkdir -p /opt/scolagestion && sudo chown $USER /opt/scolagestion
# ... déposez le projet dans /opt/scolagestion (sans node_modules ni .next)
cd /opt/scolagestion

# 2.3 Installer et construire
npm ci
npx prisma generate
npx prisma db push
npm run build
```

## 3. Le fichier `.env` de PRODUCTION

```ini
DATABASE_URL=file:../db/custom.db

# MOT DE PASSE : OBLIGATOIREMENT fort et unique (c'est celui du compte direction)
SG_MDP_DEMO=UnMotDePasseDe24Caracteres!Minimum
# NE PAS mettre SG_AFFICHER_COMPTES_DEMO → la page de login n'affichera
# AUCUN compte en production (NODE_ENV=production le garantit aussi)

# CHIFFREMENT DES DONNÉES MÉDICALES (obligatoire : 32+ caractères aléatoires)
SG_CLE_CHIFFREMENT=génerez-avec: openssl rand -hex 32

# ENVOIS RÉELS (optionnels mais recommandés pour les relances de scolarité)
# SG_EMAIL_API_URL=https://api.brevo.com/v3/smtp/email
# SG_EMAIL_API_TOKEN=xkeysib-votre-cle
# SG_EMAIL_FROM=no-reply@monecole.sn
# SG_SMS_API_URL=https://api.orange.com/smsmessaging/v1/send
# SG_SMS_API_TOKEN=votre-token
```

> ⚠️ **Ne perdez jamais `SG_CLE_CHIFFREMENT`** : les fiches santé deviendraient illisibles. Conservez-la avec les sauvegardes.

## 4. Créer votre école RÉELLE (zéro donnée fictive)

```bash
SEED_VIERGE=1 \
SEED_ECOLE_NOM="Cours La Réussite" \
SEED_ECOLE_SLUG="la-reussite" \
SEED_DIRECTION_EMAIL="direction@lareussite.sn" \
SEED_DIRECTION_MDP="LeMotDePasseChoisi!" \
npm run seed
```

Le terminal affiche **une seule fois** :
- le compte direction,
- le **secret TOTP** (à scanner dans Google Authenticator / Authy),
- **10 codes de secours** (à imprimer et conserver en coffre).

> Le rôle Direction **exige la double authentification** : ce secret est indispensable pour votre première connexion.

## 5. Service au démarrage (systemd)

```ini
# /etc/systemd/system/scolagestion.service
[Unit]
Description=ScolaGestion
After=network.target

[Service]
WorkingDirectory=/opt/scolagestion
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/opt/scolagestion/.env
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now scolagestion
```

## 6. HTTPS automatique avec Caddy

```bash
# /etc/caddy/Caddyfile — remplacer le fichier fourni par :
gestion.monecole.sn {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Forwarded-For {remote_host}
    }
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains"
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }
}
sudo systemctl reload caddy
```

Caddy obtient et renouvelle **automatiquement** le certificat Let's Encrypt.
Vérification : `https://gestion.monecole.sn` → page de connexion.

## 7. Sauvegardes (automatiques + hors-site)

- **Automatique** : une sauvegarde SQLite cohérente est créée au démarrage du
  service puis **toutes les 24 h** (fichiers dans `db/backups/`, rétention 30).
- **Manuelle** : module Sécurité → Sauvegardes → « Créer une sauvegarde ».
- **Hors-site (IMPORTANT)** : les backups vivent sur le même disque. Chaque
  semaine, téléchargez la dernière depuis le module Sécurité, ou montez un
  second disque/réplication :
  ```bash
  # exemple : copie quotidienne vers un disque monté
  echo '0 3 * * * cp /opt/scolagestion/db/backups/$(ls -t /opt/scolagestion/db/backups | head -1) /mnt/backup/' | crontab -
  ```

## 8. Premier jour dans l'école (~2-3 h)

1. Connectez-vous avec le compte direction + code TOTP.
2. **Module « Salles & Calendrier »** :
   - section **Matières** → ajoutez vos matières (MATHS, FR, HG…) et coefficients ;
   - section **Classes** → ajoutez vos classes réelles (6B, 6C…) + titulaires ;
   - section Salles → vos salles.
3. **Module Personnel** : créez les enseignants et le personnel (avec comptes —
   mot de passe temporaire affiché une fois).
4. **Module Élèves** : inscrivez les élèves + rattachez les parents.
5. **Module Finances** : créez les frais de scolarité → générez les échéances
   par classe → encaissez (reçu imprimable).
6. **Module EDT** : créez les créneaux hebdomadaires → « Générer séances » →
   les enseignants font l'appel chaque matin (l'anti-oubli alerte la direction).

## 9. Vérifications après installation

```bash
curl -s https://gestion.monecole.sn/api          # {"statut":"ok",...}
sudo systemctl status scolagestion               # active (running)
ls /opt/scolagestion/db/backups/ | tail -1       # une sauvegarde existe
```

Puis dans l'application : module Sécurité → les sessions/tentatives de
connexion ne montrent que les vôtres ; portail élève = uniquement ses notes.

## 10. Maintenance

| Opération | Comment |
|---|---|
| Mettre à jour l'app | déposer le nouveau code → `npm ci && npx prisma db push && npm run build` → `sudo systemctl restart scolagestion` |
| Restaurer une sauvegarde | module Sécurité (super-admin) ou `cp db/backups/<fichier> db/custom.db` après arrêt du service |
| Rejouer les tests | `npm run seed && npm run test:regression && npm run test:angles` (41 tests — sur une copie, pas en production !) |
| Ajouter une école (multi-établissements) | se connecter en super-admin (compte éditeur) → module SaaS → « Créer une école » (onboarding complet automatique) |

## 11. Limites assumées (v1 production)

- Paiements **au guichet** (espèces/chèque/virement/mobile money saisie manuelle) — pas de paiement en ligne intégré.
- Bulletins et reçus s'impriment via le navigateur (PDF natif), pas de génération PDF serveur.
- Un seul serveur (pas de cluster) — largement suffisant pour une école, jusqu'à plusieurs milliers d'élèves.
- Les SMS/emails partent uniquement si un fournisseur est configuré (§3) ; sinon les notifications restent internes à l'application.


## 12. Nouvelles fonctionnalités opérationnelles (v3)

| Fonctionnalité | Où |
|---|---|
| **Cantine du jour** (menus, pointage, alertes allergènes) | Services → Cantine du jour |
| **Transport quotidien** (feuilles de route, retards → alertes direction) | Services → Transport du jour |
| **Garderie** (pointage à la minute, facturation mensuelle) | Services → Garderie |
| **Pointage personnel** (arrivée/départ, heures sup → paie) | Personnel → Pointage |
| **Activités / Sorties / Voyages** (autorisation parentale, facturation) | Module Activités & Sorties |
| **Import CSV élèves / personnel / EDT** | Élèves / Personnel / Salles |
| **Échéancier personnalisé + remises fratries** | Finances → Échéances |
| **Relances automatiques d'impayés** (J+7, J+15, J+30) | tâche quotidienne + bouton Finances |
| **Rapprochement bancaire** | Finances → Comptabilité |
| **Virements de paie (CSV banque)** | Personnel → Paie |
| **Analytics direction** (recouvrement, vieillissement, trésorerie, pédagogie) | Dashboard direction |
| **Consultation des années clôturées** | Sélecteur d'année (header) |
| **Rapport de trimestre imprimable** | Dashboard direction |
| **PV + convocations de conseil** | Conseils de classe |
| **Attestations / certificats** | Fiche élève |
| **Candidature publique** (formulaire sans compte) | `https://votre-domaine/admission?ecole=slug` |
| **Sauvegarde cloud** | `SG_BACKUP_WEBDAV_URL` + `SG_BACKUP_WEBDAV_TOKEN` dans .env |

### Relances automatiques
Lancées quotidiennement par le serveur (instrumentation) : impayés à J+7, J+15 et J+30 → notification à la direction avec idempotence (une relance par seuil). Le bouton « Relancer les impayés » (Finances → Échéances) déclenche la même logique à la demande.

### Tâches quotidiennes du serveur
Au démarrage puis toutes les 24 h : sauvegarde automatique + relances impayés + rappels de vaccination échus.
