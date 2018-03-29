function memoizeMethod(descriptor: TypedPropertyDescriptor<any>) {
  const originalValue = descriptor.value;
  let hasRun = false;
  let returnedValue: any;

  descriptor.value = function(...args: any[]) {
    if (!hasRun) {
      returnedValue = originalValue.apply(this, args);
      hasRun = true;
    }

    return returnedValue;
  };
}

function memoizeGetAccessor(descriptor: TypedPropertyDescriptor<any>) {
  const originalGet = descriptor.get;
  const originalSet = descriptor.set;
  let hasRun = false;
  let returnedValue: any;

  if (originalGet !== undefined) {
    descriptor.get = function(...args: any[]) {
      if (!hasRun) {
        returnedValue = originalGet.apply(this, args);
        hasRun = true;
      }

      return returnedValue;
    };
  }

  if (originalSet !== undefined) {
    descriptor.set = function(...args: any[]) {
      hasRun = false;
      return originalSet.apply(this, args);
    };
  }
}

export const Memoize: MethodDecorator = function Memoize(_target, _propertyName, descriptor) {
  if (descriptor.value !== undefined) {
    memoizeMethod(descriptor);
  } else if (descriptor.get !== undefined) {
    memoizeGetAccessor(descriptor);
  } else {
    throw new Error("Only methods or getters can be decorated with Memoize.");
  }
};

export const Benchmark: MethodDecorator = function Benchmark(_target, propertyName, descriptor: TypedPropertyDescriptor<any>) {
  const originalValue = descriptor.value;

  descriptor.value = function(...args: any[]) {
    const t0 = performance.now();
    const value = originalValue.apply(this, args);
    console.log(`[${propertyName}] ${performance.now() - t0}`);
    return value;
  };
};

export const Bind: MethodDecorator = function Bind(_target, propertyName, descriptor: TypedPropertyDescriptor<any>) {
  return {
    get() {
      const value = descriptor.value.bind(this);
      Object.defineProperty(this, propertyName, {value});
      return value;
    }
  };
};

export const Debounce = function Debounce(delay: number) {
  let timer: number | null = null;

  return function<T extends () => void>(_target: Object, _propertyName: string, descriptor: TypedPropertyDescriptor<T>) {
    return {
      value: function() {
        const fn = descriptor.value!.bind(this);
        if (timer === null) {
          fn();
        } else {
          clearTimeout(timer);
          const wrap: any = () => {
            fn();
            timer = null;
          };
          timer = setTimeout(wrap, delay);
        }
      }
    };
  };
};
