type MapEntries<K, V> = [K, V][];
type ValueGetter<K, V> = (key?: K) => V;

export class DefaultMap<K, V> extends Map<K, V> {
  private getDefaultValue: ValueGetter<K, V>;

  constructor(getDefaultValue: V, entries?: MapEntries<K, V>);
  constructor(getDefaultValue: V | ValueGetter<K, V>, entries?: MapEntries<K, V>) {
    super(entries);
    if (typeof getDefaultValue === "function") {
      this.getDefaultValue = getDefaultValue;
    } else {
      this.getDefaultValue = () => getDefaultValue;
    }
  }

  get(key: K): V | undefined {
    let val: V | undefined;
    if (this.has(key)) {
      val = super.get(key);
    } else {
      val = this.getDefaultValue(key);
      this.set(key, val);
    }
    return val;
  }
}
