export function clamp(n: number, min: number, max: number): number {
  if (n < min) {
    return min;
  }
  if (n > max) {
    return max;
  }
  return n;
}

export function imageLoaded(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0;
}

export class TimeoutError extends Error {
  constructor(msg: string) {
    super(`Operation timed out: ${msg}`);
  }
}

export interface SignedData<T extends ArrayLike<number>> {
  byteSignature: T;
}

export function isSignedData<DataType extends TypedArray, SignatureType extends ArrayLike<number>>(
  data: DataType,
  signature: SignatureType
): data is DataType & SignedData<SignatureType> {
  for (let i = 0; i < signature.length; i++) {
    if (data[i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

export function signData<DataType extends TypedArray, SignatureType extends ArrayLike<number>>(
  data: DataType,
  signature: SignatureType
): DataType & SignedData<SignatureType> {
  const signed: DataType = Reflect.construct(data.constructor, [signature.length + data.length]);
  
  signed.set(signature, 0);
  signed.set(data, signature.length);

  if (isSignedData(signed, signature)) {
    return signed;
  }

  throw new Error("Failed to sign data correctly");
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}