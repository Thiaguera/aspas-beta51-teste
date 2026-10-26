# ASPAS Contingência — Beta 51 teste (66062)

Cópia pública sanitizada dos fontes `0.2.9-beta.51-conta-sem-cancelados`, pacote `br.com.aspas.contingencia.beta51test`. Não é o projeto Recuperação em Kotlin, nem a antiga cópia para Bolt.

## Arquitetura preservada
- Interface/regras: HTML, CSS e JavaScript puro em `app/src/main/assets`.
- Android: Java, WebView, bridges de persistência AtomicFile, impressão TCP ESC/POS e sincronização local NSD/mDNS.
- Android mínimo API 26; compile/target 35; AGP 8.7.2; Gradle 8.9 e JDK 17.

## Segurança desta publicação
Foram removidos os 19 cadastros reais, hashes de PIN, nomes pessoais e hosts operacionais. Os perfis demonstrativos estão **sem PIN**, portanto não permitem login até configuração local. As rotas foram preservadas com IPs TEST-NET (192.0.2.0/24) e impressoras desativadas. Não configurar equipamentos reais para experimentos. Marca e catálogo foram preservados para revisão do aplicativo solicitado pelo proprietário; não são dados de vendas.

Não foram incluídos APK, keystore, assinatura, banco, exportações operacionais, backups, `local.properties` ou caches. A cópia original e o APK existente não foram alterados. `PUBLICACAO.json` registra origem, sanitização e hashes dos fontes originais, não credenciais.

### Preparar demonstração local
Após clonar, execute `node tools/restore-sources.cjs`. Os arquivos maiores estão compactados sem perda em `source-parts/`, por limitação de envio. Esse comando restaura os fontes completos e as 5 imagens PNG antes da análise, do preview ou da compilação.

Execute `node tools/configure-demo.cjs` e informe um PIN fictício de teste. Esse comando configura apenas os perfis demonstrativos na sua cópia local; não envie o resultado ao GitHub. Use navegador/perfil ou instalação limpos. O script não habilita impressoras nem configura rede real. A autenticação legada migra o hash no login pelo patch de segurança existente; isso não é homologação de segurança.

Para visualizar apenas a interface: `python3 -m http.server 8000 --directory app/src/main/assets`. Abra localhost:8000. Bridges Android, impressão e mesh não funcionam como no aparelho nesse preview; não concluir que estão testadas.

## Compilar
Instale JDK 17, Android SDK platform 35 e Gradle 8.9. Configure o SDK via ANDROID_HOME ou `local.properties` local e execute `gradle assembleDebug`. Nenhum Gradle Wrapper foi encontrado nos fontes originais; não há wrapper inventado nesta cópia. O primeiro build pode baixar dependências. A configuração de resolução fixada na raiz veio do ambiente de compilação anterior.

**Esta publicação não recompilou nem homologou o APK sanitizado.** O antigo relatório de build 66051 não foi incluído como se descrevesse esta versão 66062.

## Evidências e bloqueios conhecidos
Execute `node tests/verify-findings.js` e `node tests/reproduce-beta51-offline.js` (Node 18+). São harnesses com dados fictícios e stubs, não execução completa do app. Sucesso do primeiro significa que os defeitos históricos foram reproduzidos, **não que a sincronização está aprovada**.

A auditoria histórica em `docs/AUDITORIA-OFFLINE-HISTORICA.md` aponta:
1. Transferência concorrente com edição pode deixar a mesma sessão em duas mesas.
2. Fechamento concorrente com lançamento offline pode omitir o item reconciliado sem quarentena.
3. Quarentena local de pagamento não prova convergência financeira.
4. Publicação após fechamento precisa de validação integrada.

Não usar em atendimento antes de corrigir os bloqueios e homologar em dois Androids, rede e impressoras de teste. Sucesso TCP não comprova papel impresso e não garante impressão física exatamente uma vez.

## Revisão no Emergent
Leia `PROMPT-EMERGENT.md`. Primeiro diagnóstico, sem alterações nem deploy. Não migrar para React, Next.js, Flutter, Expo, backend cloud ou outro framework. Não reescrever o produto.
