#!/bin/bash

# Script para build e criar ZIP da extensão

echo "🔨 Iniciando build da extensão..."

# Faz o build do projeto
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build!"
    exit 1
fi

echo "✅ Build concluído!"
echo "📦 Criando arquivo ZIP..."

# Remove ZIP anterior se existir
rm -f timeline-extension.zip

# Cria o ZIP da pasta dist
cd dist && zip -r ../timeline-extension.zip . && cd ..

if [ $? -eq 0 ]; then
    echo "✅ Extensão empacotada com sucesso!"
    echo "📁 Arquivo criado: timeline-extension.zip"
    echo ""
    echo "Para instalar:"
    echo "1. Vá em chrome://extensions/"
    echo "2. Ative 'Modo do desenvolvedor'"
    echo "3. Clique em 'Carregar sem compactação'"
    echo "4. Selecione a pasta 'dist/'"
else
    echo "❌ Erro ao criar ZIP!"
    exit 1
fi
