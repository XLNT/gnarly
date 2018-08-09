(Symbol as any).asyncIterator =
  (Symbol as any).asyncIterator ||
    Symbol.for('Symbol.asyncIterator')
