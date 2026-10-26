/* Quantidade adicional somente em linhas com unidades aguardando envio. */
(function(g){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const style=document.createElement('style');style.textContent=`.pending-quantity{display:inline}.pending-quantity .quantity-link{margin-left:12px}.pending-quantity dialog{border:1px solid #8B6754;border-radius:16px;background:#F3EADB;color:#4A3024;padding:22px;width:min(340px,calc(100vw - 40px));box-sizing:border-box;box-shadow:0 12px 40px #0005}.pending-quantity dialog::backdrop{background:#20130eb3}.pending-quantity h3{font-size:20px;margin:0 0 8px}.pending-quantity dialog p{font-size:13px;line-height:1.5;margin:0 0 18px;color:#6D5749}.quantity-stepper{display:flex;align-items:center;justify-content:center;border:1px solid #C8B7A3;background:#E8DCCB;border-radius:10px;overflow:hidden;margin-bottom:18px}.quantity-stepper button{background:transparent;color:#4A3024;min-width:48px;min-height:48px;font-size:24px}.order .quantity-stepper input{width:100%;min-width:0;border:0!important;border-radius:0;background:transparent!important;color:#4A3024!important;text-align:center;font-family:inherit;font-size:22px;font-weight:800;padding:10px 0;box-shadow:none;appearance:textfield}.quantity-stepper input::-webkit-inner-spin-button{appearance:none}.quantity-actions{display:flex;gap:10px}.quantity-actions button{flex:1;min-height:44px;border-radius:8px;font-weight:750;border:1px solid #C8B7A3;background:transparent;color:#4A3024}.quantity-actions .quantity-confirm{background:#4A3024;color:#FFF8EE;border-color:#4A3024}`;document.head.appendChild(style);
g.pendingQuantityControl=function(i){return `<span class="pending-quantity"><button type="button" class="item-note-button quantity-link" onclick="document.getElementById('pendingDialog${i}').showModal()">Adicionar quantidade</button><dialog id="pendingDialog${i}" aria-labelledby="pendingTitle${i}"><h3 id="pendingTitle${i}">Adicionar quantidade</h3><p>Quantas unidades a mais? Serão adicionadas ao mesmo item, sem enviar o pedido.</p><div class="quantity-stepper"><button type="button" aria-label="Diminuir unidades adicionais" onclick="stepPendingQuantity(${i},-1)">−</button><input id="pendingQty${i}" type="number" inputmode="numeric" min="1" max="9999" step="1" value="1" aria-label="Unidades adicionais"><button type="button" aria-label="Aumentar unidades adicionais" onclick="stepPendingQuantity(${i},1)">+</button></div><div class="quantity-actions"><button type="button" onclick="document.getElementById('pendingDialog${i}').close()">Voltar</button><button type="button" class="quantity-confirm" onclick="addPendingQuantity(${i})">Adicionar</button></div></dialog></span>`};
g.stepPendingQuantity=function(i,delta){const e=document.getElementById('pendingQty'+i);e.value=String(Math.max(1,Math.min(9999,(Number(e.value)||1)+delta)))};

g.addPendingQuantity=function(i){
 const actor=g.AspasSecurity?.assertSession?.();
 let x=order[i],o=savedOrders[currentTable];
 if(!actor||!o||!x||Number(x[2])<1||!canLaunch(x[4]||categoryOf(x[0]))) {toast('Seu perfil não pode adicionar este produto.');return false}
 if(!pendingItemQuantity(x)||sendingItemQuantity(x)||uncertainItemQuantity(x)){toast('Quantidade indisponível: confira o estado de envio.');return false}
 if(g.AspasPrintQueue?.operations().some(a=>a.table===currentTable&&(a.state==='prepared'||a.state==='recovery-required'||a.plans?.some(p=>p.state==='needs-review')))){toast('Confira a recuperação da mesa antes de adicionar.');return false}
 const qty=Number(document.getElementById('pendingQty'+i)?.value);
 if(!Number.isSafeInteger(qty)||qty<1||qty>9999||!Number.isSafeInteger(Number(x[2])+qty)){toast('Informe de 1 a 9999 unidades inteiras.');return false}
 let future=clone(savedOrders),item=future[currentTable].items[i];g.AspasSyncV3.pnChange(item,qty);
 let ok=false;try{let s=durableStateV2();ok=stateCommitV2({orders:future,sales:s.sales,payments:s.payments,paymentOwners:s.paymentOwners,closedSessions:s.closedSessions})===true}catch(_){}
 if(!ok){toast('Não foi possível gravar. A quantidade não foi alterada.');return false}
 savedOrders=future;order=savedOrders[currentTable].items;try{persistOrders()}catch(_){}
 audit('quantidade adicional: '+item[0],`${currentTable} · +${qty} unidade(s)`);renderOrder();toast(`${qty} unidade(s) adicionada(s). Revise e envie quando concluir.`);return true;
};
renderOrder();
})(window);
