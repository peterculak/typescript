
type Listener<EventType> = (ev: EventType) => void;
function createObserver<EventType>(): {
  subscribe: (listener: Listener<EventType>) => () => void;
  publish: (event: EventType) => void;
} {

  let listeners: Listener<EventType>[] = [];
  return {
    subscribe: (listener: Listener<EventType>): () => void => {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter(l => l !== listener);
      }
    },
    publish: (event: EventType): void => {
      listeners.forEach((l: Listener<EventType>) => l(event));
    }
  }
}

interface BeforeSetEvent<T> {
  value: T;
  newValue: T;
}

interface AfterSetEvent<T> {
  value: T;
}

interface GetRecordEvent<T> {
  value: T;
}

interface Pokemon {
  id: string;
  attack: number;
  defense: number;
}

interface BaseRecord {
  id: string;
}

interface Database<T extends BaseRecord> {
  set(newValue: T): void
  get(id: string): T
  onBeforeAdd(listener: Listener<BeforeSetEvent<T>>): () => void;
  onAfterAdd(listener: Listener<AfterSetEvent<T>>): () => void;
}

class InMemoryDatabase<T extends BaseRecord> implements Database<T> {
  private db: Record<string, T> = {};
  private constructor(){}
  private static instance: InMemoryDatabase<any>;

  private beforeAddListeners = createObserver<BeforeSetEvent<T>>();
  private afterAddListeners = createObserver<AfterSetEvent<T>>();
  private getRecordListeners = createObserver<GetRecordEvent<T>>();

  static createDatabase<T extends BaseRecord>(): InMemoryDatabase<T> {
    if (!this.instance) {
      this.instance = new this<T>();
    }

    return this.instance;
  }

  set(newValue: T): void {
    this.beforeAddListeners.publish({
      newValue,
      value: this.db[newValue.id]
    });

    this.db[newValue.id] = newValue;

    this.afterAddListeners.publish({
      value: this.db[newValue.id]
    });
  }

  get(id: string): T | undefined {
    const record = this.db[id];
    this.getRecordListeners.publish({
      value: record
    });

    return record;
  }

  onBeforeAdd(listener: Listener<BeforeSetEvent<T>>): () => void {
    return this.beforeAddListeners.subscribe(listener);
  }

  onAfterAdd(listener: Listener<AfterSetEvent<T>>): () => void {
    return this.afterAddListeners.subscribe(listener);
  }

  onAfterGet(listener: Listener<GetRecordEvent<T>>): () => void {
    return this.getRecordListeners.subscribe(listener);
  }
}

const pokemonDB = InMemoryDatabase.createDatabase<Pokemon>();
const unsubscribeRead = pokemonDB.onAfterGet(({value}) => console.log(`reading from db '${value.id}'`, value));
const unsubscribeWrite = pokemonDB.onAfterAdd(({value}) => console.log(`writing to db '${value.id}'`, value));

pokemonDB.set({
  id: 'Dynosaur',
  attack: 50,
  defense: 10
});

const obj = pokemonDB.get('Dynosaur');

pokemonDB.set({
  id: 'TRex',
  attack: 100,
  defense: 100
});

const trex = pokemonDB.get('TRex');