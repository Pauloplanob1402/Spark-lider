# Sparks Líder — Como sumir com a barra de URL no TWA

A barra de URL aparece no TWA quando o `assetlinks.json` não está
configurado corretamente com o SHA-256 do seu keystore.

## Passos

1. Gere o keystore no Bubblewrap:
   ```bash
   bubblewrap init --manifest https://SEU-DOMINIO.vercel.app/manifest.json
   ```

2. Pegue o SHA-256:
   ```bash
   keytool -list -v -keystore android.keystore -alias android
   ```

3. Edite o arquivo `.well-known/assetlinks.json`:
   - Substitua `SEU.PACKAGE.NAME` pelo package name escolhido (ex: `com.sparklider.alpha`)
   - Substitua `COLE_AQUI_O_SHA256` pelo SHA-256 do passo 2

4. Faça commit e deploy na Vercel

5. Teste: https://SEU-DOMINIO.vercel.app/.well-known/assetlinks.json
   deve retornar o JSON correto

Depois disso o Bubblewrap/TWA esconde a barra de URL automaticamente.
