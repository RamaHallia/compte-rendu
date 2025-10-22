# 🎧 Guide d'installation BlackHole

## Pourquoi BlackHole ?

**Problème** : Par défaut, l'application ne peut capturer que :
- ❌ Le microphone seul (bloque Discord/Zoom)
- ❌ L'audio d'une seule app/onglet (via partage d'écran)

**Solution** : BlackHole permet de capturer **TOUT l'audio système** :
- ✅ Toutes les voix Discord + Zoom + Teams en même temps
- ✅ Voix en présentiel (via micro) + voix en visio
- ✅ Automatique, sans popup de partage d'écran

---

## 📥 Installation (macOS)

### 1. Télécharger BlackHole

```bash
# Option 1 : Via Homebrew (recommandé)
brew install blackhole-2ch

# Option 2 : Téléchargement manuel
# Allez sur : https://github.com/ExistentialAudio/BlackHole
# Téléchargez "BlackHole2ch.vX.X.X.pkg"
```

### 2. Installer le package

- Double-cliquez sur le fichier `.pkg` téléchargé
- Suivez les instructions d'installation
- Redémarrez votre Mac si demandé

---

## ⚙️ Configuration

### Étape 1 : Configuration du son macOS

1. **Ouvrir les Paramètres Système**
   - Menu Apple () → Réglages Système

2. **Accéder aux réglages Son**
   - Cliquez sur "Son" dans la barre latérale

3. **Configurer la sortie audio**
   - Onglet "Sortie"
   - Sélectionnez **"BlackHole 2ch"**

⚠️ **Important** : Vous n'entendrez plus le son de votre Mac !  
💡 **Solution** : Utilisez l'application "Audio MIDI Setup" pour créer un périphérique multi-sortie (voir ci-dessous)

### Étape 2 : Créer un Multi-Output Device (OPTIONNEL mais recommandé)

Pour **entendre** ET **enregistrer** en même temps :

1. **Ouvrir Audio MIDI Setup**
   - Applications → Utilitaires → Configuration Audio MIDI
   - Ou via Spotlight : `Audio MIDI Setup`

2. **Créer un périphérique Multi-Sortie**
   - Clic sur le bouton **"+"** en bas à gauche
   - Sélectionnez **"Créer un périphérique à sorties multiples"**

3. **Configurer les sorties**
   - Cochez **"BlackHole 2ch"**
   - Cochez **"Haut-parleurs intégrés"** (ou vos écouteurs/casque)
   - Définissez les haut-parleurs comme **"Périphérique principal"** (clic droit)

4. **Utiliser le Multi-Output**
   - Paramètres Système → Son → Sortie
   - Sélectionnez **"Périphérique à sorties multiples"**

✅ Maintenant vous entendez ET BlackHole capture l'audio !

---

## 🎤 Utilisation dans l'application

### Avec BlackHole configuré :

1. **Lancez l'application de compte-rendu**

2. **Sélectionnez "Audio complet"**

3. **Cliquez sur "Démarrer l'enregistrement"**

4. **Dans la popup de microphone :**
   - Si BlackHole est votre sortie audio, l'app le détectera automatiquement
   - ✅ Elle capturera TOUT l'audio système (Discord, Zoom, Teams, etc.)
   - ✅ Pas besoin de partage d'écran !

### Logs de détection :

Ouvrez la console du navigateur (F12) pour voir :
```
Périphériques audio disponibles: ["BlackHole 2ch", "Microphone MacBook Pro", ...]
BlackHole détecté ! Utilisation du périphérique: BlackHole 2ch
```

---

## 🔧 Dépannage

### Je n'entends plus rien !

**Cause** : BlackHole est configuré comme sortie audio  
**Solution** : Créez un "Périphérique à sorties multiples" (voir Étape 2)

### L'application ne détecte pas BlackHole

**Vérifiez** :
1. BlackHole est bien installé (`ls /Library/Audio/Plug-Ins/HAL/`)
2. BlackHole est sélectionné comme sortie audio (Paramètres → Son)
3. Vous avez autorisé l'accès au microphone pour le navigateur
4. Rechargez la page de l'application

### Autres cas

- **Windows** : Utilisez [VB-Audio Cable](https://vb-audio.com/Cable/) (équivalent de BlackHole)
- **Linux** : Utilisez PulseAudio Loopback Module

---

## 📊 Comparaison des méthodes

| Méthode | Avantages | Inconvénients |
|---------|-----------|---------------|
| **Microphone seul** | Simple, fonctionne partout | ❌ Bloque Discord/Zoom |
| **Partage d'écran** | Pas d'installation | ❌ Une seule app à la fois<br>❌ Popups à chaque fois |
| **BlackHole** | ✅ Toutes les apps<br>✅ Automatique<br>✅ Pas de popup | Installation requise |

---

## 🎯 Résumé rapide

**Pour capturer TOUTES les voix (présentiel + visio) :**

1. Installez BlackHole : `brew install blackhole-2ch`
2. Créez un Multi-Output Device (pour entendre)
3. Configurez-le comme sortie audio
4. Lancez l'app → Mode "Audio complet" → Démarrer
5. ✅ Toutes les voix sont capturées !

---

## 📚 Ressources

- [BlackHole GitHub](https://github.com/ExistentialAudio/BlackHole)
- [BlackHole Wiki](https://github.com/ExistentialAudio/BlackHole/wiki)
- [Audio MIDI Setup Guide](https://support.apple.com/guide/audio-midi-setup/)

