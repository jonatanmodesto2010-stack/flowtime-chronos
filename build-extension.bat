@echo off
REM Script para build e criar ZIP da extensão (Windows)

echo 🔨 Iniciando build da extensão...

call npm run build

if errorlevel 1 (
    echo ❌ Erro no build!
    exit /b 1
)

echo ✅ Build concluído!
echo 📦 Criando arquivo ZIP...

REM Remove ZIP anterior se existir
if exist timeline-extension.zip del timeline-extension.zip

REM Cria o ZIP usando PowerShell
powershell -Command "Compress-Archive -Path dist\* -DestinationPath timeline-extension.zip -Force"

if errorlevel 0 (
    echo ✅ Extensão empacotada com sucesso!
    echo 📁 Arquivo criado: timeline-extension.zip
    echo.
    echo Para instalar:
    echo 1. Vá em chrome://extensions/
    echo 2. Ative 'Modo do desenvolvedor'
    echo 3. Clique em 'Carregar sem compactação'
    echo 4. Selecione a pasta 'dist/'
) else (
    echo ❌ Erro ao criar ZIP!
    exit /b 1
)
