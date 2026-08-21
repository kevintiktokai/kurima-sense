import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A queued capture replays under the key its live attempt already spent.
 *
 * `lib/http` refuses to retry POSTs because it cannot tell "never arrived" from
 * "arrived, committed, response lost". The outbox has no such option — replaying
 * is the entire point of it — so it sends the server a stable token instead and
 * lets the server recognise the second copy.
 *
 * The subtle half is on this side. `submitCapture` tries the network first and
 * queues only if that fails, and the failure it queues on *includes* the
 * ambiguous one. If the queued item minted a fresh id, the replay would look
 * like a brand-new capture and the harvest would be recorded twice — the exact
 * duplicate the key exists to prevent, sailing straight through the mechanism
 * built to stop it.
 *
 * That invariant lives across three files and is invisible in any one of them,
 * which is what this guards.
 */

const ROOT = process.cwd()
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

test('the live attempt and its queued replay share one key', () => {
    const submit = read('lib/offline/submit.ts')

    // Minted once, before the live send.
    const minted = submit.indexOf('const idempotencyKey = crypto.randomUUID()')
    const sent = submit.indexOf('httpSend(args.endpoint, args.body, args.method ?? \'POST\', idempotencyKey)')
    const queued = submit.indexOf('id: idempotencyKey')

    assert.ok(minted > -1, 'no key is minted in submitCapture')
    assert.ok(sent > minted, 'the live send does not carry the minted key')
    assert.ok(queued > minted, 'the queued item does not reuse the minted key')
})

test('enqueue accepts a caller-supplied id rather than always minting', () => {
    const outbox = read('lib/offline/outbox.ts')
    assert.match(outbox, /id: args\.id \?\? crypto\.randomUUID\(\)/)
})

test('a replay from the queue sends the item id as its key', () => {
    // The item id IS the idempotency anchor — OutboxItem's own comment has
    // always said so. This is the line that finally puts it on the wire.
    const outbox = read('lib/offline/outbox.ts')
    assert.match(outbox, /httpSend\(it\.endpoint, it\.body, it\.method, it\.id\)/)
})

test('httpSend sets the header when given a key, and omits it otherwise', () => {
    const outbox = read('lib/offline/outbox.ts')
    assert.match(outbox, /if \(idempotencyKey\) headers\['Idempotency-Key'\] = idempotencyKey/)
})

test('the outbox item id is still documented as the anchor', () => {
    // If this comment ever stops being true, the three files above are lying
    // to each other.
    const types = read('lib/offline/types.ts')
    assert.match(types, /stable across retries \(idempotency anchor\)/)
})

test('a fresh enqueue with no prior attempt still gets an id', () => {
    // Not every enqueue follows a live send. Those must still be keyed, or the
    // replay of a purely-offline capture is unguarded.
    const outbox = read('lib/offline/outbox.ts')
    const enqueueBody = outbox.split('export async function enqueue', 1)[1] ?? outbox
    assert.match(enqueueBody, /crypto\.randomUUID\(\)/)
})
