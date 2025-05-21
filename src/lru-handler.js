// LRU Cache implementation
class LRUCache {
  constructor(options = {}) {
    this.calculateItemWeight = options.calculateItemWeight || null;

    if (this.calculateItemWeight && options.maxWeight != null && options.maxWeight > 0) {
      this.isWeightedMode = true;
      this.maxWeight = options.maxWeight;
      this.maxSize = Infinity; // In weighted mode, item count is not directly limited by maxSize
    } else {
      this.isWeightedMode = false;
      this.maxSize = options.maxSize || 50; // Default item count if not weighted
      this.maxWeight = Infinity; // In item count mode, total weight is not limited
    }

    this.cache = new Map(); // Stores key -> { value, weight }
    this.keyTimestamps = new Map(); // Stores key -> timestamp for LRU
    this.currentWeight = 0;
  }

  // Generate a cache key from messages
  static generateKey(messages) {
    // Create a stable key by combining the content of the last 3 messages
    // or fewer if there aren't 3 messages
    const messagesToConsider = messages.slice(Math.max(0, messages.length - 3));
    const keyParts = messagesToConsider.map(msg => `${msg.role}:${msg.content}`);
    return keyParts.join('|');
  }

  // Check if a key exists and is valid
  has(key) {
    return this.cache.has(key);
  }

  // Get a value from cache
  get(key) {
    if (!this.has(key)) return null;
    
    // Update the timestamp when accessed
    this.keyTimestamps.set(key, Date.now());
    const entry = this.cache.get(key);
    return entry.value;
  }

  // Set a value in cache
  set(key, value) {
    let itemWeight = 0;
    if (this.isWeightedMode) {
      itemWeight = this.calculateItemWeight(value);
      // Item too large for the entire cache capacity
      if (itemWeight > this.maxWeight) {
        // console.warn(`Item (key: ${key}, weight: ${itemWeight}) exceeds cache maxWeight (${this.maxWeight}). Not caching.`);
        // If it was an update, ensure the old key is fully removed if it existed
        if (this.cache.has(key)) {
            const oldEntry = this.cache.get(key);
            this.currentWeight -= oldEntry.weight;
            this.cache.delete(key);
            this.keyTimestamps.delete(key);
        }
        return;
      }
    }

    // If the key already exists, remove its old entry first to handle weight changes correctly
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key);
      if (this.isWeightedMode) {
        this.currentWeight -= oldEntry.weight;
      }
      this.cache.delete(key);
      this.keyTimestamps.delete(key);
    }

    if (this.isWeightedMode) {
      // Evict items until there's space for the new item
      while (this.cache.size > 0 && (this.currentWeight + itemWeight > this.maxWeight)) {
        if (!this.evictOneLRU()) break; // Break if cache became empty
      }

      // If there's space, add the item
      if (this.currentWeight + itemWeight <= this.maxWeight) {
        this.cache.set(key, { value, weight: itemWeight });
        this.keyTimestamps.set(key, Date.now());
        this.currentWeight += itemWeight;
      } // else: console.warn(`Not enough space for item (key: ${key}, weight: ${itemWeight}). Not caching.`);
    } else { // Item count mode
      // If cache is full (already removed existing key if it was an update)
      if (this.cache.size >= this.maxSize) {
        this.evictOneLRU();
      }
      this.cache.set(key, { value, weight: 0 }); // Store with weight 0 for consistent entry structure
      this.keyTimestamps.set(key, Date.now());
    }
  }

  getOldestKey() {
    if (this.keyTimestamps.size === 0) return null;
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, timestamp] of this.keyTimestamps.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestKey = key;
      }
    }
    return oldestKey;
  }

  evictOneLRU() {
    const oldestKey = this.getOldestKey();
    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);
      this.keyTimestamps.delete(oldestKey);
      
      if (this.isWeightedMode && entry && entry.weight != null) {
        this.currentWeight -= entry.weight;
      }
      return true; // Evicted an item
    }
    return false; // Cache was empty
  }

  // Clear the entire cache
  clear() {
    this.cache.clear();
    this.keyTimestamps.clear();
    this.currentWeight = 0;
  }
}

// Create a global memory cache instance using weighted strategy
const memoryCache = new LRUCache({
  maxWeight: 10 * 1024 * 1024, // 10MB total character "weight" for strings
  calculateItemWeight: (value) => {
    if (typeof value === 'string') {
      return value.length; // Weight is the string length
    }
    return 1; // Default weight for non-string items
  }
});

export { LRUCache, memoryCache }; 