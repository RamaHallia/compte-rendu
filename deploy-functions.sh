#!/bin/bash

echo "🚀 Déploiement des Edge Functions Supabase"
echo "=========================================="

# Vérifier si npx supabase est disponible
if ! command -v npx &> /dev/null; then
    echo "❌ npx n'est pas disponible. Installez Node.js d'abord."
    exit 1
fi

# Vérifier la version de Supabase CLI
echo "📦 Version Supabase CLI:"
npx supabase --version

echo ""
echo "📋 Instructions pour déployer:"
echo "1. Allez sur https://supabase.com/dashboard"
echo "2. Sélectionnez votre projet hgpwuljzgtlrwudhqtuq"
echo "3. Allez dans 'Edge Functions'"
echo "4. Créez une nouvelle fonction 'transcribe-audio'"
echo "5. Copiez le contenu de supabase/functions/transcribe-audio/index.ts"
echo "6. Déployez la fonction"
echo ""
echo "✅ Les modifications de rate limiting sont prêtes à être déployées !"
