# Beta 51 66062: auditoria isolada de reconciliação offline

## Resultado
Dois bloqueios reproduzidos na lógica de reconciliação dos arquivos exatos contidos no APK. Não é homologação Android nem constatação de perda real nos aparelhos de Thiago.

### 1. Transferência versus edição offline: mesma sessão em duas mesas
Com a sessão S na Mesa 1 em uma réplica e transferida à Mesa 2 em outra, mergeState mantém ambas. Resultado: Mesa 1/S com quantidade 1 e Mesa 2/S com quantidade 2. A reconciliação é indexada por mesa e não resolve a localização única da sessão.
Fonte: app/src/main/assets/patch-sync.js, linhas 37 e 52.

### 2. Fechamento versus lançamento offline: item não preservado no resultado
Uma réplica tem a sessão S aberta com um novo item I-OFFLINE-NEW; outra já encerrou S. Ao mesclar, a sessão aberta é removida e a venda encerrada não incorpora o item. Não é criado registro de quarentena para esse conflito. O item deixa de existir no estado reconciliado retornado, ainda que possa continuar em uma réplica ou cópia anterior. Não afirmar destruição de todo backup.
Fonte: patch-sync.js, linha 37 (closedSessions/sales prevalecem e removem orders).

## Outros resultados, com limites
- Dois incrementos no mesmo identificador de item, por atores distintos, somaram 2 no teste PN.
- Conflito de pagamentos gerou quarentena local e reteve o pagamento local. Isso não prova convergência financeira entre aparelhos.
- O fechamento não chamou o agendador de publicação no harness reduzido. Tratar como hipótese de integração a investigar, não como falha comprovada de transporte real: não carregamos toda a aplicação nem executamos Java/WebView.

## Correção recomendada, ainda não implementada
1. Reconciliar localização por sessionId, com revisão/tombstone de transferência e isolamento de movimentos concorrentes. Uma sessão não pode ficar operável em duas mesas.
2. Fechamento concorrente com alterações não reconhecidas deve preservar a comanda/alterações em quarentena e bloquear resolução automática silenciosa; não reabrir nem cobrar automaticamente.
3. Testes de regressão: duas ordens de entrega, duplicação de pacote, reconexões repetidas, reinício e persistência. Só depois homologar em dois Androids de teste.

Até corrigir: não considerar aprovada a operação offline concorrente com transferências ou fechamento da mesma comanda. Não limpar dados, não repetir em comandas reais. Testes básicos já confirmados por Thiago continuam válidos apenas para seus cenários.

## Evidências
- APK: aspas-beta51-conta-sem-cancelados.apk, SHA-256 fcce9680fe31f84ae15a8261e8bb6844cd766901f5443410b03d4e52511f4d7a.
- patch-sync.js, bootstrap-state.js e patch-payments.js foram comparados byte a byte com os assets do APK: iguais.
- verify-findings.js: harness Node VM, dados fictícios e armazenamento em memória, 7 asserções concluídas; carrega código real, mas substitui DOM, armazenamento Android, rede e helpers por stubs.
- verified-results.json: saída verificada.
- Para reproduzir neste workspace: node tests/verify-findings.js.

Fontes, APK, produção, dados dos aparelhos e impressoras não foram alterados. Nenhuma mensagem enviada. Couvert continua adiado.
