/* ASPAS beta51 — descontos e isenção de taxa. Carregar após patch-integration.js. */
(function(g){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v));
const cents=v=>Math.round(Number(v||0)*100);
const value=c=>typeof fromCents==='function'?fromCents(c):c/100;
const fmt=c=>typeof moneyFromCents==='function'?moneyFromCents(c):`R$ ${(c/100).toFixed(2)}`;
const rawSubtotalCents=subtotalCents, rawServiceRate=typeof SERVICE_RATE==='number'?SERVICE_RATE:.10;
function active(){return currentTable&&savedOrders[currentTable]?savedOrders[currentTable]:null}
function adjustment(o=active()){let a=o?.adjustments;return a&&typeof a==='object'&&!Array.isArray(a)?a:null}
function orderSubtotalCents(o){return (o?.items||order||[]).reduce((sum,item)=>sum+cents(item?.[1])*Math.max(0,Number(item?.[2]||0)),0)}
function numbers(o=active()){
 const gross=Math.max(0,o&&o!==active()?orderSubtotalCents(o):rawSubtotalCents()); const a=adjustment(o);
 let discount=0;
 if(a){discount=a.kind==='percent'?Math.round(gross*Math.min(100,Math.max(0,Number(a.amount||0)))/100):Math.min(gross,Math.max(0,Number(a.amountCents||0)));}
 const net=Math.max(0,gross-discount),rate=a?.removeService?0:rawServiceRate,service=Math.round(net*rate);
 return {gross,discount,net,rate,service,total:net+service};
}
/* Totais canônicos passam a considerar o ajuste somente na comanda atual. */
subtotalCents=function(){return numbers().gross};
serviceChargeCents=function(){return numbers().service};
totalCents=function(){return numbers().total};
subtotal=function(){return value(numbers().gross)};
serviceCharge=function(){return value(numbers().service)};
total=function(){return value(numbers().total)};
g.AspasAdjustments={numbers,adjustment};
function canAuthorize(){return g.AspasSecurity?.authorize?.('manager')||g.AspasSecurity?.authorize?.('close:bill')}
function paymentTotal(){return typeof paymentSumCents==='function'?paymentSumCents():0}
function saveAdjustment(next){
 const before=clone(savedOrders), future=clone(savedOrders); future[currentTable].adjustments=next;
 /* stateCommitV2 é transacional; em caso de falha, a comanda em memória permanece intacta. */
 let ok=false;
 try{if(typeof stateCommitV2==='function'){let s=durableStateV2();ok=stateCommitV2({orders:future,sales:s.sales,payments:s.payments,paymentOwners:s.paymentOwners,closedSessions:s.closedSessions});}else{savedOrders=future;persistOrders();ok=true;}}catch(e){console.error('Falha ao salvar ajuste',e);ok=false}
 if(!ok){savedOrders=before;order=before[currentTable]?.items||order;toast('Ajuste não salvo: a comanda permaneceu inalterada.');return false}
 savedOrders=future;order=savedOrders[currentTable].items;/* mantém o caminho legado sincronizado */
 try{persistOrders()}catch(e){console.error(e)}
 return true;
}
function closeAdjustment(){document.getElementById('adjustmentModal')?.classList.remove('show')}
function openAdjustment(){
 if(!canAuthorize()){toast('Seu perfil não pode autorizar descontos ou isenção.');return}
 const o=active();if(!o){toast('Abra uma comanda antes de aplicar desconto.');return}
 if(paymentTotal()>numbers(o).total){toast('Remova pagamentos antes de reduzir o total desta conta.');return}
 const a=adjustment(o),m=document.getElementById('adjustmentModal');
 document.getElementById('adjustmentKind').value=a?.kind||'percent';document.getElementById('adjustmentValue').value=a?(a.kind==='percent'?a.amount:(a.amountCents/100).toFixed(2).replace('.',',')):'';
 document.getElementById('adjustmentService').checked=!!a?.removeService;document.getElementById('adjustmentReason').value=a?.reason||'';m.classList.add('show');setTimeout(()=>document.getElementById('adjustmentValue').focus(),50);
}
function commitAdjustment(){
 const actor=canAuthorize();if(!active()){toast('Abra uma comanda antes de aplicar ajustes.');return}if(!actor){toast('Apenas gerente ou perfil autorizado ao fechamento pode aplicar ajustes.');return}
 const kind=document.getElementById('adjustmentKind').value,raw=document.getElementById('adjustmentValue').value.trim();
 const amount=raw===''?0:parseAmount(raw),reason=document.getElementById('adjustmentReason').value.trim(),removeService=document.getElementById('adjustmentService').checked;
 if(amount===null||!Number.isFinite(amount)||amount<0){toast('Informe um desconto válido ou marque a isenção da taxa.');return}
 if(!['percent','fixed'].includes(kind)){toast('Selecione o tipo de desconto.');return}
 if(kind==='fixed'&&cents(amount)>rawSubtotalCents()){toast('O desconto não pode ultrapassar o subtotal.');return}
 if(kind==='percent'&&amount>100){toast('O desconto percentual não pode ultrapassar 100%.');return}
 if(!reason){toast('A justificativa é obrigatória.');return}
 const candidate={kind,amount:kind==='percent'?amount:undefined,amountCents:kind==='fixed'?cents(amount):undefined,removeService,reason,operator:{id:actor.id,name:actor.name,role:actor.role},timestamp:new Date().toISOString()};
 const gross=rawSubtotalCents(),discount=kind==='percent'?Math.round(gross*amount/100):Math.min(gross,candidate.amountCents),newTotal=Math.max(0,gross-discount)+Math.round(Math.max(0,gross-discount)*(removeService?0:rawServiceRate));
 if(paymentTotal()>newTotal){toast('O ajuste reduziria o total abaixo dos pagamentos já registrados. Remova pagamentos antes de salvar.');return}
 if(!saveAdjustment(candidate))return;closeAdjustment();renderOrder();renderPaymentParts();if(typeof audit==='function')audit('desconto / isenção taxa 10',reason);toast('Ajuste autorizado e salvo na comanda.');
}
g.openAdjustment=openAdjustment;g.closeAdjustment=closeAdjustment;g.commitAdjustment=commitAdjustment;
const legacyRender=renderOrder;
renderOrder=function(){legacyRender();let n=numbers(),a=adjustment();let discount=document.getElementById('discountRow'),rate=document.getElementById('serviceRateLabel'),subtotalEl=document.getElementById('subtotal'),serviceEl=document.getElementById('serviceCharge'),breakdown=document.getElementById('checkoutBreakdown');if(subtotalEl)subtotalEl.textContent=fmt(n.gross);if(discount){discount.hidden=!a;discount.querySelector('b').textContent=`− ${fmt(n.discount)}`;}if(rate)rate.textContent=a?.removeService?'Taxa de serviço · isenta':'Taxa de serviço · 10%';if(serviceEl)serviceEl.textContent=fmt(n.service);if(breakdown)breakdown.textContent=a?`Subtotal ${fmt(n.gross)} − desconto ${fmt(n.discount)} + taxa de serviço (${a.removeService?'isenta':'10%'}) ${fmt(n.service)}.`:`Subtotal ${fmt(n.gross)} + taxa de serviço (10%) ${fmt(n.service)}.`;};
const legacyPaymentParts=renderPaymentParts;
renderPaymentParts=function(){legacyPaymentParts();let n=numbers(),field=document.getElementById('paymentAmount');if(field&&!field.value)field.placeholder=n.total-paymentTotal()>0?fmt(Math.max(0,n.total-paymentTotal())).replace('R$ ',''):'';};
/* Não permitir mover apenas parte de uma comanda com ajuste: o ajuste pertence à comanda inteira. */
const legacyMove=moveSelectedItems;
moveSelectedItems=function(){if(adjustment()){toast('Esta comanda possui desconto/isenção. Use Transferir mesa para preservar o ajuste.');return false}return legacyMove.apply(this,arguments)};
})(window);
