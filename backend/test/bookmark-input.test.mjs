import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { bookmarkTitle, bookmarkUrl } from '../dist/bookmarks/bookmark-input.js';

test('bookmarkTitle trims outer whitespace while preserving content and case', () => {
  assert.equal(bookmarkTitle('  NestJS Guide  '), 'NestJS Guide');
  assert.equal(bookmarkTitle('เรียน TypeScript'), 'เรียน TypeScript');
  assert.equal(bookmarkTitle('\tRead  Later\n'), 'Read  Later');
});

test('bookmarkTitle rejects non-string input as a bad request', () => {
  for (const value of [null, undefined, 42, true, [], {}, new String('Title')]) {
    assert.throws(() => bookmarkTitle(value), (error) =>
      error instanceof BadRequestException && error.getStatus() === 400);
  }
});

test('bookmarkTitle rejects empty or whitespace-only input', () => {
  for (const value of ['', '   ', '\t\n']) {
    assert.throws(() => bookmarkTitle(value), BadRequestException);
  }
});

test('bookmarkTitle accepts 1 through 200 Unicode code points after trimming', () => {
  assert.equal(bookmarkTitle(' A '), 'A');
  assert.equal(bookmarkTitle('x'.repeat(200)), 'x'.repeat(200));
  assert.equal(bookmarkTitle(`  ${'😀'.repeat(200)}  `), '😀'.repeat(200));
  for (const value of ['x'.repeat(201), '😀'.repeat(201)]) {
    assert.throws(() => bookmarkTitle(value), BadRequestException);
  }
});

test('bookmarkUrl accepts complete HTTP(S) links and preserves trimmed text', () => {
  for (const value of [
    'https://example.invalid', 'http://example.invalid:8080/read?q=one#part',
    'HTTPS://EXAMPLE.INVALID/%2f?q=A%20B#Title', 'https://example.invalid/เรียน',
    'http://localhost:3000/', 'http://[::1]:3000/',
  ]) {
    assert.equal(bookmarkUrl(` \t${value}\n `), value);
  }
});

test('bookmarkUrl rejects non-string, missing, malformed and relative values', () => {
  for (const value of [null, undefined, 42, true, [], {}, '', '   ',
    '/read', '//example.invalid/read', 'example.invalid', 'https://',
    'http:example.invalid', 'http:/example.invalid', 'https:///example.invalid',
    'https://bad host.invalid', 'https://example.invalid:99999/']) {
    assert.throws(() => bookmarkUrl(value), (error) =>
      error instanceof BadRequestException && error.getStatus() === 400);
  }
});

test('bookmarkUrl rejects other schemes and credentials, including encoded usernames', () => {
  for (const value of [
    'javascript:alert(1)', 'data:text/html,hello', 'file:///tmp/note',
    'ftp://example.invalid/read', 'mailto:reader@example.invalid',
    'https://user:password@example.invalid/', 'https://user@example.invalid/',
    'https://:password@example.invalid/', 'https://%75ser@example.invalid/',
  ]) {
    assert.throws(() => bookmarkUrl(value), BadRequestException);
  }
});

test('bookmarkUrl measures the 2048 limit in code points after trimming', () => {
  const prefix = 'https://example.invalid/';
  for (const character of ['x', '😀']) {
    const valid = prefix + character.repeat(2048 - [...prefix].length);
    assert.equal(bookmarkUrl(`  ${valid}  `), valid);
    assert.throws(() => bookmarkUrl(valid + character), BadRequestException);
  }
});

test('bookmarkUrl does not expose rejected input through parser errors', () => {
  const input = 'https://user:private-test-sentinel@';
  assert.throws(() => bookmarkUrl(input), (error) => {
    assert.ok(error instanceof BadRequestException);
    assert.equal(error.message, 'Bad Request');
    assert.ok(!JSON.stringify(error.getResponse()).includes('private-test-sentinel'));
    return true;
  });
});
