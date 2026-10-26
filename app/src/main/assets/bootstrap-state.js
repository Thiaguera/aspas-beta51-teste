/* ASPAS beta48 — carregar ANTES de beta48-script.js.
 * Adaptador de compatibilidade: orders/sales legados sempre leem/escrevem o
 * snapshot v2. O snapshot é a única gravação obrigatória; espelhos são opcionais.
 */
(function bootstrapAspasStateV2(global){
  'use strict';
  const STATE_KEY='aspas-state-v2', ORDER_KEY='aspas-orders-test', SALES_KEY='aspas-sales-test';
  const native=global.localStorage;
  const isObject=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const clone=v=>JSON.parse(JSON.stringify(v));
  const parse=(raw,fallback)=>{try{return raw?JSON.parse(raw):fallback}catch(_){return fallback}};
  function legacyState(){
    const orders=parse(native.getItem(ORDER_KEY),{}),sales=parse(native.getItem(SALES_KEY),[]),closed=parse(native.getItem('aspas-closed-sessions-v2'),{});
    return {version:2,orders:isObject(orders)?orders:{},sales:Array.isArray(sales)?sales:[],payments:{},paymentOwners:{},closedSessions:isObject(closed)?closed:{}};
  }
  /* Nunca recupera o backup: ele não pode ressuscitar um commit incompleto. */
  function read(){
    const raw=native.getItem(STATE_KEY);
    if(raw!==null){const state=parse(raw,null);return isObject(state)&&isObject(state.orders)&&Array.isArray(state.sales)&&isObject(state.payments)&&isObject(state.closedSessions)?state:null;}
    const migrated=legacyState();
    native.setItem(STATE_KEY,JSON.stringify(migrated));
    return migrated;
  }
  function commit(next){
    const current=read(); if(!current)return false;
    const state={version:2,orders:isObject(next?.orders)?clone(next.orders):clone(current.orders),sales:Array.isArray(next?.sales)?clone(next.sales):clone(current.sales),payments:isObject(next?.payments)?clone(next.payments):clone(current.payments),paymentOwners:isObject(next?.paymentOwners)?clone(next.paymentOwners):clone(current.paymentOwners||{}),closedSessions:isObject(next?.closedSessions)?clone(next.closedSessions):clone(current.closedSessions)};
    try{native.setItem(STATE_KEY,JSON.stringify(state));}catch(error){console.error('Falha ao gravar snapshot canônico',error);return false;}
    /* Compatibilidade apenas; erro aqui não invalida commit já confirmado. */
    try{native.setItem(ORDER_KEY,JSON.stringify(state.orders));native.setItem(SALES_KEY,JSON.stringify(state.sales));native.setItem('aspas-closed-sessions-v2',JSON.stringify(state.closedSessions));}catch(error){console.warn('Espelho legado não gravado',error);}
    return true;
  }
  const adapter={read,commit,native,STATE_KEY};
  global.AspasStateV2Storage=adapter;
  /* safeLoad/safeStore da base usa localStorage dinamicamente; este adaptador o
     faz enxergar os blocos canônicos desde sua própria inicialização. */
  const adaptedStorage={
    getItem(key){if(key===ORDER_KEY||key===SALES_KEY){const state=read();if(state)return JSON.stringify(key===ORDER_KEY?state.orders:state.sales);}return native.getItem(key);},
    setItem(key,value){
      if(key===ORDER_KEY||key===SALES_KEY){const candidate=parse(String(value),key===ORDER_KEY?{}:[]),state=read();if(!state)throw Error('Estado canônico indisponível');const next=clone(state);next[key===ORDER_KEY?'orders':'sales']=candidate;if(!commit(next))throw Error('Falha ao gravar estado canônico');return;}
      return native.setItem(key,value);
    },
    removeItem(key){return native.removeItem(key);},clear(){return native.clear();},key:i=>native.key(i),get length(){return native.length;}
  };
  Object.defineProperty(global,'localStorage',{configurable:true,get:()=>adaptedStorage});
})(window);
