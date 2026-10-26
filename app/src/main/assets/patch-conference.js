/* Conferência local, somente leitura. Não resolve conflitos nem reenvia fichas. */
(function(g){
'use strict';
const roles=['Master','ADM','Maitre'];
function allowed(){return typeof currentUser!=='undefined'&&roles.includes(currentUser?.role)}
function demand(){if(!allowed())throw Error('Conferência restrita a gerente/administrador.');}
function read(key,fallback,issues){try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw)}catch(e){issues.push({type:'armazenamento_ilegivel',severity:'critica',reference:key,detail:'Registro local ilegível; preservar dados e solicitar revisão.'});return fallback}}
function cents(n){return Math.round(Number(n)*100)}
function collect(){
 demand();const issues=[],limits=['Leases: não implementados nesta base.','Sincronização por evento/ACK: indisponível; presença de peer não comprova convergência.','Auditoria de cancelamento: não há vínculo estável item-evento para comprovar cobertura.','Impressão: transmissão TCP não comprova saída física da ficha.'];
 const s=typeof durableStateV2==='function'?durableStateV2():null;
 if(!s||!s.orders||!Array.isArray(s.sales))throw Error('Estado canônico indisponível.');
 const push=(type,severity,reference,detail)=>issues.push({type,severity,reference:String(reference||''),detail});
 // Verificar também o registro canônico bruto, sem tentar repará-lo.
 read('aspas-state-v2',null,issues);
 for(const key of ['aspas-sync-quarantine-v3','aspas-sync-quarantine-v4']){
  const records=read(key,[],issues);
  if(!Array.isArray(records)){push('armazenamento_formato_invalido','critica',key,'Quarentena não é uma lista.');continue}
  for(const r of records)push('conflito_em_quarentena','alta',r?.id||key,String(r?.reason||'Sem motivo registrado'));
 }
 const tickets=typeof kitchenTickets!=='undefined'&&Array.isArray(kitchenTickets)?kitchenTickets:read('aspas-kitchen-test',[],issues);
 if(!Array.isArray(tickets))push('armazenamento_formato_invalido','critica','aspas-kitchen-test','Fila não é uma lista.');
 else for(const t of tickets){
  if(!t||typeof t!=='object'){push('ficha_invalida','alta','','Ficha inválida na fila local.');continue}
  if(/incerto|falh|erro/i.test(String(t.status||'')))push('impressao_requer_conferencia','alta',t.id,`${t.table||''} · ${t.route||''} · ${t.status}`);
  if(t.kind==='Cancelamento')push('cancelamento_sem_confirmacao_fisica','alta',t.id,`${t.table||''}: aviso registrado; entrega física não comprovada.`);
 }
 for(const [table,o] of Object.entries(s.orders)){
  if(!o||typeof o!=='object'){push('comanda_invalida','critica',table,'Comanda inválida.');continue}
  if(String(table).startsWith('__QUARENTENA__'))push('comanda_isolada_legada','alta',table,'Sessão legada isolada requer revisão.');
  for(const item of Array.isArray(o.items)?o.items:[]){
   if(!Array.isArray(item)){push('item_invalido','alta',table,'Item inválido.');continue}
   const dispatch=item[12]?.dispatch||{};
   for(const [token,ev] of Object.entries(dispatch)){
    if(ev?.state==='uncertain')push('despacho_incerto','alta',token,`${table} · ${item[0]} · ${ev.route||''}`);
    else if(ev?.state==='inflight'&&Number.isFinite(Number(ev.at))&&Date.now()-Number(ev.at)>120000)push('despacho_sem_retorno','alta',token,`${table} · ${item[0]}: transmissão sem retorno há mais de 120s; não reenviar automaticamente.`);
   }
  }
 }
 for(const sale of s.sales){
  if(!sale||!Array.isArray(sale.payments)||!sale.payments.length){push('pagamento_legado_sem_detalhe','media',sale?.saleId||sale?.table,'Venda sem detalhamento de pagamentos; não inferir divergência.');continue}
  const values=sale.payments.map(p=>Number(p?.amount)),total=Number(sale.total);
  if(!Number.isFinite(total)||values.some(v=>!Number.isFinite(v)||v<0))push('valor_financeiro_invalido','critica',sale.saleId||sale.table,'Valor financeiro inválido.');
  else if(values.reduce((n,v)=>n+cents(v),0)!==cents(total))push('divergencia_pagamento','critica',sale.saleId||sale.table,'Soma dos pagamentos difere do total registrado.');
 }
 return {schema:'aspas-conferencia-v1',origin:'contingência',generatedAt:new Date().toISOString(),scope:'snapshot local atual; sem filtro de período e sem garantia de completude entre dispositivos',device:typeof syncDeviceId==='function'?syncDeviceId():'não informado',operator:currentUser?.name||'',openOrders:Object.keys(s.orders).length,closedSales:s.sales.length,issues,limitations:limits};
}
function csv(report){const cell=v=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,m=>"'"+m).replace(/"/g,'""')+'"';const rows=[['Origem','contingência'],['Gerado em',report.generatedAt],['Dispositivo',report.device],['Operador',report.operator],['Escopo',report.scope],[],['Tipo','Gravidade','Referência','Detalhe'],...report.issues.map(i=>[i.type,i.severity,i.reference,i.detail]),[],['Limitações'],...report.limitations.map(l=>[l])];return '\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\r\n')}
function exportReport(format='json'){
 demand();if(!['json','csv'].includes(format))throw Error('Formato inválido.');const report=collect(),text=format==='csv'?csv(report):JSON.stringify(report,null,2);
 downloadFile(text,`aspas-conferencia-${report.generatedAt.replace(/[:.]/g,'-')}.${format}`,format==='csv'?'text/csv;charset=utf-8':'application/json');
 if(typeof audit==='function')audit('exportação de conferência',`${format} · ${report.issues.length} alerta(s)`);return report;
}
function open(){
 const report=collect(),e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let d=document.getElementById('aspasConferenceDialog');if(!d){d=document.createElement('dialog');d.id='aspasConferenceDialog';d.style.cssText='max-width:760px;width:90%;max-height:85vh;overflow:auto;border:1px solid #aaa;border-radius:12px;padding:20px';document.body.appendChild(d)}
 d.innerHTML=`<h2>Conferência local</h2><p>${report.issues.length} alerta(s). Sem reenvio, correção automática ou alteração das comandas.</p><p><small>${e(report.scope)}</small></p><ul>${report.issues.map(i=>`<li><b>${e(i.severity)} · ${e(i.type)}</b><br>${e(i.reference)}: ${e(i.detail)}</li>`).join('')||'<li>Nenhum alerta detectado pelas verificações disponíveis. Isso não certifica ausência de problemas.</li>'}</ul><h3>Não verificável nesta versão</h3><ul>${report.limitations.map(l=>`<li>${e(l)}</li>`).join('')}</ul><button onclick="AspasConference.exportReport('json')">Exportar JSON</button> <button onclick="AspasConference.exportReport('csv')">Exportar CSV</button> <button onclick="document.getElementById('aspasConferenceDialog').close()">Fechar</button>`;
 if(!d.open)d.showModal();return report;
}
g.AspasConference={collect,exportReport,open,csv};
})(window);
