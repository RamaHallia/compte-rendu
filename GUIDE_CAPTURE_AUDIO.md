# 🎙️ Guide de Capture Audio - Mode SaaS

## 🎯 Objectif

Capturer **toutes les voix** lors d'une réunion hybride :
- ✅ Personnes physiquement présentes (présentiel)
- ✅ Personnes à distance (visio)

## 📊 Comment ça fonctionne ?

### Mode "Audio Complet" (Recommandé)

L'application utilise les API natives du navigateur pour capturer :

1. **Audio système** (via `getDisplayMedia`) → Voix des participants en visio
2. **Microphone** (via `getUserMedia`) → Voix des personnes présentes
3. **Mixage** (via `AudioContext`) → Combine les deux sources en un seul enregistrement

```
┌─────────────────────────────────────────────────┐
│              Navigateur Web                     │
│                                                 │
│  [Discord/Zoom/Teams] ──→ getDisplayMedia()    │
│         ↓                        ↓              │
│   Audio visio ────────────┐                     │
│                            ↓                     │
│  [Microphone] ──→ getUserMedia()                │
│         ↓                        ↓              │
│   Audio présentiel ───────→ AudioContext        │
│                                  ↓              │
│                            Flux combiné         │
│                                  ↓              │
│                            Enregistrement       │
└─────────────────────────────────────────────────┘
```

## ✅ Instructions utilisateur (3 étapes)

### Étape 1 : Sélectionner la réunion

Dans la popup de partage qui s'ouvre :
- **Si visio dans le navigateur** (Discord Web, Teams Web, Meet) → Sélectionner **l'onglet**
- **Si visio dans une app** (Zoom, Teams App, Discord App) → Sélectionner **la fenêtre**

### Étape 2 : ⚠️ CRUCIAL - Cocher "Partager l'audio"

**Sans cette case cochée, les voix en visio ne seront PAS enregistrées !**

Libellés selon les navigateurs :
- **Chrome** : "Partager l'audio de l'onglet"
- **Firefox** : "Son de l'onglet"
- **Edge** : "Partager l'audio"
- **Safari** : "Partager l'audio du système"

### Étape 3 : Autoriser le microphone

Une deuxième popup demande l'accès au micro → Cliquer sur **"Autoriser"**

## 🔍 Logs de débogage

L'application affiche des logs détaillés dans la console (F12) :

```
🎙️ Démarrage du mode Audio Complet (Présentiel + Visio)
✅ Audio de la visio capturé
✅ Microphone capturé
🔊 Audio visio connecté au mixeur
🎤 Microphone connecté au mixeur
✅ Mode Audio Complet actif - Enregistrement de toutes les voix
```

Si un problème survient :
```
⚠️ Aucune piste audio détectée - Vérifiez que "Partager l'audio" est coché
```

## 🚨 Limitations connues

### 1. Une seule plateforme de visio à la fois

❌ **Ne fonctionne PAS** :
- Participants sur Discord **ET** Zoom en même temps
- Plusieurs onglets/fenêtres de visio

✅ **Fonctionne** :
- Tous sur Discord **OU** tous sur Zoom **OU** tous sur Teams

**Raison** : `getDisplayMedia` ne peut capturer qu'une seule source à la fois.

### 2. Compatibilité navigateurs

| Navigateur | Audio complet | Notes |
|------------|---------------|-------|
| Chrome | ✅ Excellent | Support complet |
| Edge | ✅ Excellent | Basé sur Chromium |
| Firefox | ⚠️ Partiel | Parfois problèmes avec certaines apps |
| Safari | ⚠️ Partiel | Nécessite macOS 13+ |

### 3. Sécurité et permissions

- L'utilisateur **doit** autoriser manuellement à chaque session
- Les permissions ne peuvent **pas** être enregistrées par le site (sécurité)
- Certains sites (ex: Netflix) bloquent la capture audio par politique

## 💡 Conseils pour vos utilisateurs

### Pour de meilleurs résultats :

1. **Centraliser la visio** : Tous les participants distants sur la même plateforme
2. **Tester avant** : Faire un test rapide de 10 secondes pour vérifier la capture
3. **Volume audio** : Vérifier que le volume de la visio est audible
4. **Réseau stable** : Une connexion stable évite les coupures audio

### Messages d'erreur courants :

**"Aucune piste audio détectée"**
→ L'utilisateur a oublié de cocher "Partager l'audio"
→ Recommencer et cocher la case

**"Permission denied"**
→ L'utilisateur a refusé l'accès au micro/partage
→ Recharger la page et autoriser

**"NotAllowedError"**
→ Le navigateur bloque la capture (ex: en navigation privée)
→ Utiliser une fenêtre normale

## 🔧 Alternatives avancées (hors SaaS)

Pour des cas d'usage spécifiques (entreprises, power users) :

### BlackHole (macOS) - Configuration locale

**Avantages** :
- ✅ Capture **tout** l'audio système (toutes les apps)
- ✅ Automatique, sans popup
- ✅ Compatible tous navigateurs

**Inconvénients** :
- ❌ Installation requise sur chaque machine
- ❌ Configuration technique
- ❌ macOS uniquement (équivalents Windows/Linux existent)

**Utilisation** : Voir `GUIDE_BLACKHOLE.md`

### Enregistrement natif (extension navigateur)

Une extension Chrome/Firefox pourrait :
- Accéder à l'audio système directement
- Éviter les popups de partage
- Meilleure intégration

**Inconvénient** : Nécessite installation + validation des stores

## 📈 Roadmap future

### À court terme :
- [ ] Détection automatique si audio visio manquant
- [ ] Message d'alerte si "Partager l'audio" non coché
- [ ] Tutoriel vidéo intégré

### À moyen terme :
- [ ] Extension navigateur officielle
- [ ] Support multi-onglets (expérimental)
- [ ] Pré-check des permissions

### À long terme :
- [ ] API WebRTC avancée pour capture système
- [ ] Support natif des apps de visio (SDK)

## 🎯 Résumé pour SaaS

**La solution actuelle est OPTIMALE pour un SaaS car :**

✅ **Pas d'installation** : Fonctionne directement dans le navigateur  
✅ **Cross-platform** : Windows, macOS, Linux  
✅ **Sécurisé** : Respecte les standards web  
✅ **Universel** : Compatible toutes les apps de visio  

**Limitations acceptables :**

⚠️ Une seule app de visio à la fois (cas d'usage rare)  
⚠️ Popup à autoriser manuellement (sécurité obligatoire)  

**Alternative (non-SaaS)** : BlackHole pour utilisateurs avancés (voir guide séparé)

---

## 📚 Ressources techniques

- [MDN - getDisplayMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia)
- [MDN - getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Screen Capture API](https://w3c.github.io/mediacapture-screen-share/)

