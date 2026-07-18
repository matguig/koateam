# Publier une version de KoaTeam

## Publier

```bash
# 1. aligner la version (desktop/src-tauri/tauri.conf.json + Cargo.toml)
# 2. tagger et pousser :
git tag v0.1.0
git push origin v0.1.0
```

Le workflow **Release** construit les installeurs (deb / dmg+app / NSIS, avec
l'UI et le démon sidecar embarqués) et publie une GitHub Release. Sans secrets
configurés, la release fonctionne mais : macOS n'est pas signé (avertissement
Gatekeeper — clic droit → Ouvrir) et l'auto-update n'est pas activé.

## Checklist avant release

- [ ] CI verte (QA 59 vérifications + endurance)
- [ ] **Endurance 48 h sur machine réelle** (critère 11 de SPEC-V1, hors
      limites GitHub Actions) : `node daemon/scripts/endurance.mjs 2000`
      sur un poste qui reste allumé — RSS de repos stable exigée
- [ ] Test manuel du parcours fondation + une tâche réelle

## Secrets GitHub à configurer (Settings → Secrets → Actions)

### Auto-update (recommandé dès la première vraie release)

| Secret | Contenu |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | La clé privée updater (générée le 18/07/2026, transmise en privé — la clé publique correspondante est déjà dans `tauri.conf.json`) |

⚠️ **Conservez cette clé précieusement** (gestionnaire de mots de passe) : perdue,
les apps déjà installées ne pourront plus jamais s'auto-mettre à jour.
L'updater vérifie `https://github.com/matguig/koateam/releases/latest/download/latest.json`
au démarrage de l'app et installe silencieusement.

### Signature & notarization macOS (nécessite un compte Apple Developer, 99 $/an)

| Secret | Contenu |
|---|---|
| `APPLE_CERTIFICATE` | Certificat « Developer ID Application » exporté en .p12, encodé base64 |
| `APPLE_CERTIFICATE_PASSWORD` | Mot de passe du .p12 |
| `APPLE_SIGNING_IDENTITY` | ex. `Developer ID Application: Matthieu ... (TEAMID)` |
| `APPLE_ID` | Votre identifiant Apple |
| `APPLE_PASSWORD` | Mot de passe d'application (appleid.apple.com → App-Specific Passwords) |
| `APPLE_TEAM_ID` | L'identifiant d'équipe (10 caractères) |

Une fois ces 6 secrets posés, les releases macOS sortent signées et notarizées
automatiquement — rien d'autre à faire.

### Signature Windows (optionnelle, plus tard)

Certificat de signature de code (OV/EV) — non configuré pour l'instant :
SmartScreen affichera un avertissement contournable.
