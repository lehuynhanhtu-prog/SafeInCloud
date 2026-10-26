import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeItems,liveItems,tombstone,sameItems} from '../dist/sync.js';

test('record merge keeps independent edits and propagates the newest deletion',()=>{
 const old={id:'a',title:'A',fields:{Login:'old'},updatedAt:'2026-01-01T00:00:00.000Z'};
 const local={...old,fields:{Login:'local'},updatedAt:'2026-01-02T00:00:00.000Z'};
 const remote={id:'b',title:'B',fields:{Login:'remote'},updatedAt:'2026-01-03T00:00:00.000Z'};
 const merged=mergeItems([local],[old,remote]);
 assert.deepEqual(liveItems(merged).map(x=>x.id),['a','b']);
 assert.equal(merged.find(x=>x.id==='a').fields.Login,'local');
 const deleted=tombstone(local,'2026-01-04T00:00:00.000Z');
 const afterDelete=mergeItems([deleted],[local,remote]);
 assert.deepEqual(liveItems(afterDelete).map(x=>x.id),['b']);
 assert(sameItems(afterDelete,[remote,deleted]));
});
