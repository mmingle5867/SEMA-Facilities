import assert from 'node:assert/strict';
import { SemaError, asSemaError, getFoundationDocumentation, settingsKey } from '../src/index.js';
assert.equal(settingsKey('VectorForge', 'Preview.Color'), 'vectorforge.preview.color');
assert.equal(asSemaError(new Error('boom')).code, 'UNEXPECTED');
assert.equal(asSemaError(new SemaError('X', 'x')).code, 'X');
assert.equal(getFoundationDocumentation().packageName, '@selo/sema-foundation');
console.log('SEMA Foundation tests passed.');
