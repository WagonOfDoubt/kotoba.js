const assert = require('assert');
const utils = require('../js/utils/object-utils');

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
      };
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
    it('should compare missing keys', () => {
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
      assert.deepEqual(utils.objectDiff(origObj, newObj, true), diff2);
    });
  });

  describe('#assignDeep()', () => {
    it('should assign to objects in arrays', () => {
      const data = {
        assets: [
          {_id: 123},
          {_id: 456},
          {_id: 789},
        ],
      };
      const payload = {
        'assets[][isDeleted]': true,
      };
      const payload2 = {
        'assets[].isDeleted': true,
      };
      const result = {
        assets: [
          {_id: 123, isDeleted: true },
          {_id: 456, isDeleted: true },
          {_id: 789, isDeleted: true },
        ],
      };
      assert.deepEqual(utils.assignDeep(data, payload), result);
      // assert.deepEqual(utils.assignDeep(data, payload2), result);
    });

    it('should create nested objects if missing', () => {
      const data = {
        foo: [
          {_id: 123},
          {_id: 456},
          {_id: 789},
        ],
        bar: {
          chocolate: false
        },
      };
      const payload = {
        'foo[][settings][size]': 42,
        'bar[info][sizes]': [1,2,3],
        'baz': 'index',
      };
      const payload2 = {
        'foo[].settings.size': 42,
        'bar.info.sizes': [1,2,3],
        'baz': 'index',
      };
      const result = {
        foo: [
          {_id: 123, settings: { size: 42 }},
          {_id: 456, settings: { size: 42 }},
          {_id: 789, settings: { size: 42 }},
        ],
        bar: {
          chocolate: false,
          info: { sizes: [1,2,3] },
        },
        'baz': 'index',
      };
      assert.deepEqual(utils.assignDeep(data, payload), result);
      assert.deepEqual(utils.assignDeep(data, payload2), result);
      assert.deepEqual(data, data);
    });

    it('should override values', () => {
      const data = {
        foo: [
          {value: 1},
          {value: 2},
          {value: 3},
        ],
        bar: {
          chocolate: false
        },
      };
      const payload = {
        'foo[][value]': 'banana',
        'bar[chocolate]': 'space ninja',
      };
      const payload2 = {
        'foo[].value': 'banana',
        'bar.chocolate': 'space ninja',
      };
      const result = {
        foo: [
          {value: 'banana'},
          {value: 'banana'},
          {value: 'banana'},
        ],
        bar: {
          chocolate: 'space ninja'
        },
      };
      assert.deepEqual(utils.assignDeep(data, payload), result);
      assert.deepEqual(utils.assignDeep(data, payload2), result);
      assert.deepEqual(data, data);
    });

    it('should handle nested arrays', () => {
      const data = {
        foo: [
          {bar: [{ baz: { val: 1 } }, { baz: { val: 4 } }]},
          {bar: [{ baz: { val: 2 } }, { baz: { val: 5 } }]},
          {bar: [{ baz: { val: 3 } }, { baz: { val: 6 } }]},
        ],
      };
      const payload = {
        'foo[][bar][][baz][val2]': 'banana',
      };
      const payload2 = {
        'foo[].bar[].baz.val2': 'banana',
      };
      const result = {
        foo: [
          {bar: [{ baz: { val: 1, val2: 'banana' } }, { baz: { val: 4, val2: 'banana' } }]},
          {bar: [{ baz: { val: 2, val2: 'banana' } }, { baz: { val: 5, val2: 'banana' } }]},
          {bar: [{ baz: { val: 3, val2: 'banana' } }, { baz: { val: 6, val2: 'banana' } }]},
        ],
      };
      assert.deepEqual(utils.assignDeep(data, payload), result);
      assert.deepEqual(utils.assignDeep(data, payload2), result);
      assert.deepEqual(data, data);
    });
  });
});
