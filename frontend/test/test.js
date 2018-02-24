const assert = require('assert');
const utils = require('../js/modules/utils');

describe('utils', () => {
  describe('#isSimpleObject()', () => {
    it('should return true for empty object ({})', () => {
      assert.ok(utils.isSimpleObject({}));
    });
    it('should return true for any simple object', () => {
      assert.ok(utils.isSimpleObject({
        a: 1,
        b: 'c',
        d: [1, 2, 3],
        e: {
          f: new Date(),
          g: Array.from([4, 5])
        }
      }));
    });
    it('should return false for arrays', () => {
      assert.ok(!utils.isSimpleObject([]));
      assert.ok(!utils.isSimpleObject([1, 2, 3, 'abc', Object]));
    });
    it('should return false for any classes', () => {
      class Dummy {
        constructor() {
          this.value = 42;
        }
      }
      assert.ok(!utils.isSimpleObject(new Dummy()));
      assert.ok(!utils.isSimpleObject(new Date()));
      assert.ok(!utils.isSimpleObject(new Array()));
    });
    it('should return false for any primitve type', () => {
      assert.ok(!utils.isSimpleObject(false));
      assert.ok(!utils.isSimpleObject(true));
      assert.ok(!utils.isSimpleObject(NaN));
      assert.ok(!utils.isSimpleObject(undefined));
      assert.ok(!utils.isSimpleObject(null));
      assert.ok(!utils.isSimpleObject(42));
      assert.ok(!utils.isSimpleObject(''));
      assert.ok(!utils.isSimpleObject('a quick brown fox jumps over a lazy dog'));
      assert.ok(!utils.isSimpleObject(Symbol()));
    });
  });

  describe('#objectToPaths()', () => {
    it('should preserve falsy values', () => {
      const obj = {
        a: null,
        b: undefined,
        d: 0,
        e: {},
        f: [],
        g: ''
      };
      assert.deepEqual(utils.objectToPaths(obj), obj);
    });
    it('should convert nested objects to plain dictionary', () => {
      const obj = {
        a: 1,
        b: {
          b1: [1, 2, 3],
          b2: 'a quick brown fox jumps over a lazy dog',
        },
        c: {
          c1: {
            c1a: 'we need',
            c1b: {
              c1b1: 'to go',
              c1b2: {
                c1b2a: 'deeper',
              },
            },
          },
        },
        d: [42],
        e: {},
      }
      const paths = {
        'a': 1,
        'b.b1': [1, 2, 3],
        'b.b2': 'a quick brown fox jumps over a lazy dog',
        'c.c1.c1a': 'we need',
        'c.c1.c1b.c1b1': 'to go',
        'c.c1.c1b.c1b2.c1b2a': 'deeper',
        'd': [42],
        'e': {},
      };
      assert.deepEqual(utils.objectToPaths(obj), paths);
    });
  });

  describe('#objectDiff()', () => {
    it('should return object only with keys of entries with different values', () => {
      const origObj = {
        a: [1,2],
        b: 'old',
        c: 3,
        d: 9,
        e: 'same',
      };
      const newObj = {
        a: [1,2],
        b: 'new',
        c: 42,
        d: 9,
        e: 'same',
      };
      const diff = {
        b: { new: 'new', old: 'old' },
        c: { new: 42, old: 3 }
      };
      assert.deepEqual(utils.objectDiff(newObj, origObj), diff);
    });
    it('should handle nested objects', () => {
      const origObj = {
        a: [1,2],
        b: {
          b1: 'old',
          b2: {
            b2a: 'same b2'
          },
        },
        c: {
          c1: 'same c1',
          c2: {
            c2a: 'old c2a',
          },
        },
        d: 9,
        e: 'same',
      };
      const newObj = {
        a: [1,2],
        b: {
          b1: 'new',
          b2: {
            b2a: 'same b2'
          },
        },
        c: {
          c1: 'same c1',
          c2: {
            c2a: 'new c2a',
          },
        },
        d: 9,
        e: 'same',
      };
      const diff = {
        'b.b1': { new: 'new', old: 'old' },
        'c.c2.c2a': { new: 'new c2a', old: 'old c2a' },
      };
      assert.deepEqual(utils.objectDiff(newObj, origObj), diff);
    });
    it('should campare missing keys', () => {
      const origObj = {
        a: [1,2]
      };
      const newObj = {
        a: [1,2],
        b: 'new value',
      };
      const diff = {
        'b': { new: 'new value', old: undefined },
      };
      assert.deepEqual(utils.objectDiff(newObj, origObj), diff);
      // in reverse order
      const diff2 = {
        'b': { new: undefined, old: 'new value' },
      };
      assert.deepEqual(utils.objectDiff(origObj, newObj), diff2);
    });
  });
});
