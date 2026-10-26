/* Read-only audit harness. Loads the exact Beta51 source files into Node VM; does not modify app sources. */
const fs=require('fs'), vm=require('vm'), path=require('path');
const src=path.resolve(__dirname,'../app/src/main/assets');
function memoryStorage(){const m=new Map;return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]||null,get length(){return m.size}}}
function ctx(device='dev-A'){
 const ls=memoryStorage(); const c={console,JSON,Date,Math,Set,Map,Object,Array,String,Number,Boolean,RegExp,Error,Promise,crypto:require('crypto').webcrypto,
  localStorage:ls,window:null,deviceId:device,currentTable:'Mesa 1',savedOrders:{},savedSales:[],order:[],activePeople:1,paymentParts:[],currentUser:{name:'Audit',role:'Master'},
  toast:()=>{},audit:()=>{},renderOrder:()=>{},renderSales:()=>{},renderFloor:()=>{},renderDashboard:()=>{},renderKitchen:()=>{},renderPaymentParts:()=>{},show:()=>{},hideTableTransfer:()=>{},hideMoveModal:()=>{},hideItemNote:()=>{},hideCancel:()=>{},closeCancel:()=>{},testPermission:()=>{},
  safeLoad:(k,d)=>d,safeStore:()=>true,normalizeDispatch:x=>x,routesForItem:()=>[],productionItemName:x=>x[0],destinationName:()=>'',ensureDestination:()=>({items:[],people:1}),
  pendingItemQuantity:()=>0,sendingItemQuantity:()=>0,uncertainItemQuantity:()=>0,totalCents:()=>1000,paymentSumCents:()=>1000,subtotal:()=>10,serviceCharge:()=>0,fromCents:x=>x/100,moneyFromCents:x=>'R$ '+(x/100).toFixed(2),SERVICE_RATE:0,
  syncDeviceId:()=>device,syncPackageId:()=> 'pkg-'+device,syncHistory:()=>[],markSyncPackage:()=>{},downloadFile:()=>{},addEventListener:()=>{},confirm:()=>false,
  openOrder:function(){},addPaymentPart:function(){},removePaymentPart:function(){},closeBill:function(){},persistOrders:function(){return true},scheduleMeshSnapshot:()=>{c.meshPublishes++},meshPublishes:0
 }; c.window=c; vm.createContext(c); return c;
}
function load(c,file){vm.runInContext(fs.readFileSync(path.join(src,file),'utf8'),c,{filename:file});}
function setup(device){const c=ctx(device);load(c,'bootstrap-state.js');load(c,'patch-payments.js');load(c,'patch-sync.js');return c;}
const out=[]; function test(name,fn){try{out.push({name,ok:true,result:fn()})}catch(e){out.push({name,ok:false,error:String(e.stack||e)})}}
const clone=x=>JSON.parse(JSON.stringify(x));
function item(id,adds){return ['Produto',10,0,0,'',{}, {},'',null,id,0,0,{kind:'pn-v2',add:adds,cancel:{},sentBase:{},sent:{},dispatch:{}}]}
// exact patch-sync merge: same item id concurrently incremented on distinct devices
test('same-item-concurrent-adds-preserved',()=>{let c=setup();let a={items:[item('I-1',{A:1})],people:1,openedAt:'2026-01-01',sessionId:'S'},b={items:[item('I-1',{B:1})],people:1,openedAt:'2026-01-01',sessionId:'S'};let r=c.mergeSyncOrder(a,b);return {quantity:r.items[0][2],add:r.items[0][12].add};});
// exact mergeState: transfer on one partition and edit remaining source on another
test('transfer-vs-edit-creates-duplicate-session-tables',()=>{let c=setup();let base={items:[item('I-1',{A:1})],people:1,openedAt:'2026-01-01',sessionId:'S'};base.items[0][2]=1;base.items[0][11]=1;let local={orders:{'Mesa 1':clone(base)},sales:[],payments:{},paymentOwners:{},closedSessions:{}};let remote={orders:{'Mesa 2':clone(base)},sales:[],payments:{},paymentOwners:{},closedSessions:{}};remote.orders['Mesa 2'].items[0][12].add.B=1;remote.orders['Mesa 2'].items[0][2]=2;remote.orders['Mesa 2'].items[0][11]=2;let r=c.AspasSyncV3.mergeState(local,remote);return {tables:Object.keys(r.orders),sessions:Object.fromEntries(Object.entries(r.orders).map(([t,o])=>[t,o.sessionId])),qty:Object.fromEntries(Object.entries(r.orders).map(([t,o])=>[t,o.items[0][2]]))};});
// exact mergeState: remote closure beats local still-open order
test('close-vs-offline-edit-discards-open-order',()=>{let c=setup();let open={items:[item('I-1',{A:1})],people:1,openedAt:'2026-01-01',sessionId:'S'};let local={orders:{'Mesa 1':open},sales:[],payments:{},paymentOwners:{},closedSessions:{}};let remote={orders:{},sales:[{saleId:'sale:S',sessionId:'S',total:10,items:[]}],payments:{},paymentOwners:{},closedSessions:{S:{saleId:'sale:S'}}};let r=c.AspasSyncV3.mergeState(local,remote);return {orders:Object.keys(r.orders),sales:r.sales.length,closed:Object.keys(r.closedSessions)};});
// exact mergeState payment conflict handling
test('concurrent-payment-conflict-is-local-quarantine-only',()=>{let c=setup();let local={orders:{'Mesa 1':{items:[],sessionId:'S'}},sales:[],payments:{S:[{method:'PIX',amount:10}]},paymentOwners:{S:{owner:'A',revision:1}},closedSessions:{}};let remote={orders:{'Mesa 1':{items:[],sessionId:'S'}},sales:[],payments:{S:[{method:'Cartão',amount:10}]},paymentOwners:{S:{owner:'B',revision:1}},closedSessions:{}};let r=c.AspasSyncV3.mergeState(local,remote);return {retainedPayment:r.payments.S,quarantine:JSON.parse(c.localStorage.getItem('aspas-sync-quarantine-v4')).map(x=>x.reason)};});
// exact bootstrap + patch-payments closeBill: commit occurs without safeStore and therefore without mesh schedule
test('close-does-not-trigger-mesh-publication',()=>{let c=ctx('device-close');load(c,'bootstrap-state.js');load(c,'patch-payments.js');c.savedOrders={'Mesa 1':{items:[['Produto',10,1]],people:1,openedAt:'2026-01-01',sessionId:'S'}};c.order=c.savedOrders['Mesa 1'].items;c.currentTable='Mesa 1';c.activePeople=1;c.paymentParts=[{method:'PIX',amount:10}];c.meshPublishes=0;c.closeBill();let s=c.durableStateV2();return {meshPublishes:c.meshPublishes,orders:Object.keys(s.orders),sales:s.sales.length,closed:Object.keys(s.closedSessions)};});
console.log(JSON.stringify(out,null,2));
