// Lightweight local data adapter for Git-first development.
// Replace these methods with Firestore calls when Firebase is connected.
export const Store={
  key:"rea_store_v1",
  read(){try{return JSON.parse(localStorage.getItem(this.key)||"{}")}catch{return {}}},
  write(data){localStorage.setItem(this.key,JSON.stringify(data));return data},
  list(collection){const d=this.read();return Array.isArray(d[collection])?d[collection]:[]},
  set(collection,items){const d=this.read();d[collection]=items;return this.write(d)[collection]},
  add(collection,item){const items=this.list(collection);const x={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),createdAt:new Date().toISOString(),...item};items.unshift(x);this.set(collection,items);return x},
  update(collection,id,patch){const items=this.list(collection).map(x=>x.id===id?{...x,...patch,updatedAt:new Date().toISOString()}:x);this.set(collection,items);return items.find(x=>x.id===id)},
  remove(collection,id){this.set(collection,this.list(collection).filter(x=>x.id!==id))}
};
