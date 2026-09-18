import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './fixture.mjs';

test('Bookmarks complete HTTP contract with two seeded identities', async (t) => {
  const f = await fixture();
  const [a, b] = f.tokens;
  const req = f.request;
  const input = { title: 'Read later', url: 'https://example.invalid/read' };
  const create = async (token, data = input) => {
    const r = await req(token, 'POST', '/bookmarks', data); assert.equal(r.status, 201); return r.body;
  };
  const collection = async (token, name) => {
    const r = await req(token, 'POST', '/collections', { name }); assert.equal(r.status, 201); return r.body;
  };
  try {
    const ca = await collection(a, 'Reading');
    const cb = await collection(b, 'Private');
    const own = await create(a, { ...input, notes: '  plain <b>text</b>  ', collectionId: ca.id });
    const foreign = await create(b, { ...input, title: 'B secret', collectionId: cb.id });
    await t.test('all routes require valid credentials', async () => {
      const before = await f.db.bookmark.count();
      for (const [method, route] of [['GET', '/bookmarks'], ['POST', '/bookmarks'], ['GET', `/bookmarks/${own.id}`], ['PUT', `/bookmarks/${own.id}`], ['PATCH', `/bookmarks/${own.id}`], ['DELETE', `/bookmarks/${own.id}`], ['GET', `/collections/${ca.id}/bookmarks`]]) {
        for (const token of [undefined, 'broken']) assert.equal((await req(token, method, route, ['POST', 'PUT', 'PATCH'].includes(method) ? input : undefined)).status, 401);
      }
      assert.equal(await f.db.bookmark.count(), before);
    });
    await t.test('create defaults, duplicate URLs, field shape and persisted identity', async () => {
      const second = await create(a);
      assert.equal(second.notes, null); assert.equal(second.collectionId, null);
      assert.equal(second.url, own.url); assert.notEqual(second.id, own.id);
      assert.equal(second.ownerId, f.users[0].id);
      assert.deepEqual(Object.keys(second).sort(), ['collectionId','createdAt','id','notes','ownerId','title','updatedAt','url']);
      assert.deepEqual((await req(a, 'GET', `/bookmarks/${second.id}`)).body, second);
      assert.equal((await f.db.bookmark.findUnique({ where: { id: second.id } })).title, second.title);
    });
    await t.test('list, counts, uncategorised and nested routes are owner-scoped', async () => {
      const all = (await req(a, 'GET', '/bookmarks')).body;
      assert.equal(all.total, 2); assert.ok(all.items.every((i) => i.ownerId === own.ownerId));
      const filtered = (await req(a, 'GET', `/bookmarks?collectionId=${ca.id}`)).body;
      assert.deepEqual(filtered.items, [own]); assert.equal(filtered.total, 1);
      assert.deepEqual((await req(a, 'GET', `/collections/${ca.id}/bookmarks`)).body, filtered);
      const uncategorised = (await req(a, 'GET', '/bookmarks?uncategorised=true')).body;
      assert.equal(uncategorised.total, 1); assert.equal(uncategorised.items[0].collectionId, null);
      const empty = await collection(a, 'Empty');
      assert.equal((await req(a, 'GET', `/collections/${empty.id}/bookmarks`)).body.total, 0);
    });
    await t.test('foreign and missing resources have identical errors without mutations', async () => {
      const before = await f.db.bookmark.findMany({ orderBy: { id: 'asc' } });
      for (const method of ['GET','PUT','PATCH','DELETE']) {
        const body = ['PUT','PATCH'].includes(method) ? input : undefined;
        const other = await req(a, method, `/bookmarks/${foreign.id}`, body);
        const absent = await req(a, method, '/bookmarks/missing', body);
        assert.equal(other.status, 404); assert.deepEqual(other, absent);
      }
      for (const path of [`/bookmarks?collectionId=${cb.id}`, `/collections/${cb.id}/bookmarks`]) {
        const other = await req(a, 'GET', path);
        const absent = await req(a, 'GET', path.replace(cb.id, 'missing'));
        assert.equal(other.status, 404); assert.deepEqual(other, absent);
      }
      for (const method of ['POST','PUT','PATCH']) {
        const path = method === 'POST' ? '/bookmarks' : `/bookmarks/${own.id}`;
        const other = await req(a, method, path, { ...input, collectionId: cb.id });
        const absent = await req(a, method, path, { ...input, collectionId: 'missing' });
        assert.equal(other.status, 404); assert.deepEqual(other, absent);
      }
      assert.deepEqual(await f.db.bookmark.findMany({ orderBy: { id: 'asc' } }), before);
    });
    await t.test('SQL composite foreign key also rejects cross-owner relationships', async () => {
      await assert.rejects(f.db.bookmark.create({ data: { ...input, ownerId: f.users[0].id, collectionId: cb.id } }));
    });
    await t.test('POST and PUT require title/url and reject invalid or immutable fields', async () => {
      for (const method of ['POST','PUT']) {
        for (const body of [{}, { title: 'Only' }, { url: input.url }, { ...input, title: null }, { ...input, url: 'javascript:alert(1)' }, { ...input, ownerId: foreign.ownerId }, { ...input, id: foreign.id }, { ...input, createdAt: own.createdAt }, { ...input, updatedAt: own.updatedAt }, { ...input, extra: 'x' }, { ...input, notes: 3 }, { ...input, notes: 'x'.repeat(5001) }, { ...input, collectionId: '' }, { ...input, collectionId: 42 }, [], null]) {
          assert.equal((await req(a, method, method === 'POST' ? '/bookmarks' : `/bookmarks/${own.id}`, body)).status, 400);
        }
      }
      assert.deepEqual((await req(a,'GET',`/bookmarks/${own.id}`)).body, own);
    });
    await t.test('PATCH preserves omitted fields; null clears only optional fields; PUT clears omitted optional fields', async () => {
      let r = await req(a,'PATCH',`/bookmarks/${own.id}`,{ title:'  New title  ' });
      assert.equal(r.status,200); assert.equal(r.body.title,'New title'); assert.equal(r.body.notes,own.notes); assert.equal(r.body.collectionId,ca.id); assert.equal(r.body.url,own.url);
      r = await req(a,'PATCH',`/bookmarks/${own.id}`,{ notes:'', collectionId:null });
      assert.equal(r.body.notes,''); assert.equal(r.body.collectionId,null);
      r = await req(a,'PATCH',`/bookmarks/${own.id}`,{ notes:null }); assert.equal(r.body.notes,null);
      for (const body of [{}, {title:null}, {url:null}, {notes:false}, {collectionId:[]}, {ownerId:foreign.ownerId}]) assert.equal((await req(a,'PATCH',`/bookmarks/${own.id}`,body)).status,400);
      await req(a,'PATCH',`/bookmarks/${own.id}`,{notes:'restore',collectionId:ca.id});
      r = await req(a,'PUT',`/bookmarks/${own.id}`,input);
      assert.equal(r.status,200); assert.equal(r.body.notes,null); assert.equal(r.body.collectionId,null); assert.equal(r.body.createdAt,own.createdAt); assert.equal(r.body.ownerId,own.ownerId);
    });
    await t.test('pagination, safe ordering and invalid filters', async () => {
      const r = await req(a,'GET','/bookmarks?page=1&pageSize=1'); assert.equal(r.body.items.length,1); assert.equal(r.body.total,2);
      const page2 = await req(a,'GET','/bookmarks?page=2&pageSize=1'); assert.notEqual(r.body.items[0].id,page2.body.items[0].id);
      assert.equal((await req(a,'GET','/bookmarks?page=3&pageSize=1')).body.items.length,0);
      for(const query of ['page=0','pageSize=101','page=1&page=2','collectionId=','collectionId=x&collectionId=y','uncategorised=false','uncategorised=true&collectionId=x','ownerId=x','name=x']) assert.equal((await req(a,'GET',`/bookmarks?${query}`)).status,400);
      assert.equal((await req(a,'GET',`/collections/${ca.id}/bookmarks?collectionId=x`)).status,400);
    });
    await t.test('moving between own collections works; deleting collection preserves bookmarks and owner', async () => {
      const target = await collection(a,'Move target');
      await req(a,'PATCH',`/bookmarks/${own.id}`,{collectionId:target.id,notes:'keep'});
      const before = (await req(a,'GET',`/bookmarks/${own.id}`)).body;
      assert.equal((await req(b,'DELETE',`/collections/${target.id}`)).status,404);
      assert.equal((await req(a,'DELETE',`/collections/${target.id}`)).status,204);
      const after = (await req(a,'GET',`/bookmarks/${own.id}`)).body;
      for(const field of ['id','url','title','notes','ownerId','createdAt']) assert.equal(after[field],before[field]);
      assert.equal(after.collectionId,null);
      assert.equal((await req(a,'GET',`/collections/${target.id}/bookmarks`)).status,404);
      assert.deepEqual((await req(b,'GET',`/bookmarks/${foreign.id}`)).body,foreign);
    });
    await t.test('delete is permanent, scoped and returns empty 204', async () => {
      const r = await req(a,'DELETE',`/bookmarks/${own.id}`); assert.equal(r.status,204); assert.equal(r.body,null);
      assert.equal((await req(a,'DELETE',`/bookmarks/${own.id}`)).status,404);
      assert.equal(await f.db.bookmark.count({where:{id:own.id}}),0);
      assert.equal((await req(b,'GET',`/bookmarks/${foreign.id}`)).status,200);
    });
  } finally { await f.close(); }
});
