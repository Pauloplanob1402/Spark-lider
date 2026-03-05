# Sparks Líder — Guia completo

## 1. Deploy na Vercel
1. Suba todos os arquivos da raiz no GitHub
2. Importe o repositório na Vercel (Framework = Other)
3. O `vercel.json` já configura todos os headers necessários

## 2. Gerar o AAB para a Play Store

### Pré-requisitos
- Java instalado (Android Studio inclui o Java em `C:\Program Files\Android\Android Studio\jbr`)

### Preencher senha do keystore
Abra `android/gradle.properties` e substitua:
- `STORE_PASSWORD` → sua senha do arquivo android.keystore
- `KEY_PASSWORD` → mesma senha (geralmente igual)

### Comandos no PowerShell
```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
cd C:\Users\Usuario\Documents\sparks-lider-app
.\gradlew bundleRelease
```

### Arquivo gerado
`app\build\outputs\bundle\release\app-release-bundle.aab`

## 3. Sumir com a barra de URL no TWA

1. Pegue o SHA-256 do seu keystore:
```powershell
keytool -list -v -keystore android.keystore -alias android
```

2. Cole o SHA-256 no arquivo `.well-known/assetlinks.json`

3. Faça commit e deploy na Vercel

4. Teste: https://spark-lider.vercel.app/.well-known/assetlinks.json

## Versões
- compileSdk: 34
- targetSdk: 34  
- buildTools: 34.0.0
- versionCode: 29
