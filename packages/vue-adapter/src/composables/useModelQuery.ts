import { computed, ref, watch, type Ref, type WritableComputedRef } from 'vue';
import { useQuery, useMutation } from '../composables.js';

/**
 * Create a two-way binding for DuckDB data with Vue 3.4's defineModel support
 * Allows v-model usage with automatic sync between component and database
 */
export function useModelQuery<T = Record<string, unknown>>(
  tableName: string,
  idField: string = 'id',
  options?: {
    selectQuery?: string;
    updateQuery?: string;
    onUpdate?: (value: T) => void;
    onError?: (error: Error) => void;
  }
): {
  model: WritableComputedRef<T | undefined>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  sync: () => Promise<void>;
  setId: (id: unknown) => void;
} {
  const currentId = ref<unknown>();
  const localValue = ref<T>();
  
  // Query for reading data
  const selectSql = computed(() => 
    options?.selectQuery || 
    `SELECT * FROM ${tableName} WHERE ${idField} = ?`
  );
  
  const { data, loading: queryLoading, error: queryError, refetch } = useQuery<T>(
    selectSql,
    computed(() => currentId.value ? [currentId.value] : undefined),
    { enabled: computed(() => !!currentId.value) }
  );
  
  // Mutation for updating data
  const { mutate, loading: mutationLoading, error: mutationError } = useMutation<T>();
  
  // Watch for query data changes
  watch(data, (newData) => {
    if (newData && newData.length > 0) {
      localValue.value = newData[0];
    }
  });
  
  // Create v-model compatible computed property
  const model = computed({
    get: () => localValue.value,
    set: (value: T | undefined) => {
      if (!value) {
        localValue.value = undefined;
        return;
      }
      
      localValue.value = value;
      
      // Update database
      try {
        const updateSql = options?.updateQuery || 
          `UPDATE ${tableName} SET data = ? WHERE ${idField} = ?`;
        
        void mutate(updateSql, [JSON.stringify(value), currentId.value]);
        options?.onUpdate?.(value);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        options?.onError?.(error);
      }
    }
  });
  
  const sync = () => {
    return Promise.resolve(refetch());
  };
  
  // Method to set the ID and trigger data fetch
  const setId = (id: unknown) => {
    currentId.value = id;
  };
  
  return {
    model,
    loading: computed(() => queryLoading.value || mutationLoading.value),
    error: computed(() => queryError.value || mutationError.value),
    sync,
    setId,
  };
}

/**
 * Enhanced model query with batch updates
 * Supports updating multiple fields efficiently
 */
export function useBatchModelQuery<T extends Record<string, unknown>>(
  tableName: string,
  options?: {
    debounce?: number;
    batchSize?: number;
    onBatchUpdate?: (updates: Partial<T>[]) => void;
  }
): {
  models: Map<string, WritableComputedRef<T>>;
  createModel: (id: string) => WritableComputedRef<T>;
  flushUpdates: () => Promise<void>;
  pendingUpdates: Ref<number>;
} {
  const models = new Map<string, WritableComputedRef<T>>();
  const pendingUpdates = ref(0);
  const updateQueue = new Map<string, Partial<T>>();
  let flushTimer: NodeJS.Timeout | null = null;
  
  const { mutate } = useMutation<T>();
  
  const flushUpdates = async () => {
    if (updateQueue.size === 0) return;
    
    const updates = Array.from(updateQueue.entries());
    updateQueue.clear();
    pendingUpdates.value = 0;
    
    // Batch update query
    const batchSql = `
      UPDATE ${tableName}
      SET data = CASE id
        ${updates.map(([_id]) => `WHEN ? THEN ?`).join(' ')}
      END
      WHERE id IN (${updates.map(() => '?').join(',')})
    `;
    
    const params: unknown[] = [];
    updates.forEach(([id, data]) => {
      params.push(id, JSON.stringify(data));
    });
    updates.forEach(([id]) => {
      params.push(id);
    });
    
    await mutate(batchSql, params);
    options?.onBatchUpdate?.(updates.map(([, data]) => data));
  };
  
  const scheduleFlush = () => {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      void flushUpdates();
    }, options?.debounce || 500);
  };
  
  const createModel = (id: string): WritableComputedRef<T> => {
    if (models.has(id)) {
      return models.get(id) as WritableComputedRef<T>;
    }
    
    const { data } = useQuery<T>(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [id]
    );
    
    const model = computed({
      get: () => data.value?.[0] || {} as T,
      set: (value: T) => {
        updateQueue.set(id, value);
        pendingUpdates.value = updateQueue.size;
        scheduleFlush();
      }
    });
    
    models.set(id, model);
    return model;
  };
  
  return {
    models,
    createModel,
    flushUpdates,
    pendingUpdates,
  };
}

/**
 * Create a model with validation
 */
export function useValidatedModel<T extends Record<string, unknown>>(
  tableName: string,
  validator: (value: T) => { valid: boolean; errors?: string[] },
  options?: {
    onValidationError?: (errors: string[]) => void;
    autoSave?: boolean;
  }
): {
  model: WritableComputedRef<T | undefined>;
  errors: Ref<string[]>;
  isValid: Ref<boolean>;
  save: () => Promise<void>;
} {
  const localValue = ref<T>();
  const errors = ref<string[]>([]);
  const isValid = ref(true);
  
  const { mutate } = useMutation<T>();
  
  const model = computed({
    get: () => localValue.value,
    set: (value: T | undefined) => {
      if (!value) {
        localValue.value = undefined;
        errors.value = [];
        isValid.value = true;
        return;
      }
      
      const validation = validator(value);
      isValid.value = validation.valid;
      errors.value = validation.errors || [];
      
      if (!validation.valid) {
        options?.onValidationError?.(validation.errors || []);
        if (!options?.autoSave) return;
      }
      
      localValue.value = value;
      
      if (options?.autoSave && validation.valid) {
        void save();
      }
    }
  });
  
  const save = async () => {
    if (!isValid.value || !localValue.value) return;
    
    await mutate(
      `INSERT OR REPLACE INTO ${tableName} (data) VALUES (?)`,
      [JSON.stringify(localValue.value)]
    );
  };
  
  return {
    model,
    errors,
    isValid,
    save,
  };
}