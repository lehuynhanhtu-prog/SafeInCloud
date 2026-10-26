function stamp(item){
 const value=Date.parse(item?.updatedAt||item?.deletedAt||'');
 return Number.isFinite(value)?value:0;
}

function stable(value){
 if(Array.isArray(value))return`[${value.map(stable).join(',')}]`;
 if(value&&typeof value==='object')return`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
 return JSON.stringify(value);
}

function newer(left,right){
 const a=stamp(left),b=stamp(right);
 if(a!==b)return a>b?left:right;
 return stable(left)>=stable(right)?left:right;
}

export function isDeleted(item){return typeof item?.deletedAt==='string'&&item.deletedAt.length>0}

export function liveItems(items){return items.filter(item=>!isDeleted(item))}

export function tombstone(item,now=new Date().toISOString()){
 return{id:item.id,title:item.title||'',category:item.category||'APP',fields:{},updatedAt:now,deletedAt:now};
}

export function mergeItems(local,remote){
 const merged=new Map();
 for(const item of [...local,...remote]){
  if(!item||typeof item.id!=='string')continue;
  merged.set(item.id,merged.has(item.id)?newer(merged.get(item.id),item):item);
 }
 return[...merged.values()].sort((a,b)=>a.id.localeCompare(b.id));
}

export function sameItems(left,right){
 return stable([...left].sort((a,b)=>a.id.localeCompare(b.id)))===stable([...right].sort((a,b)=>a.id.localeCompare(b.id)));
}
