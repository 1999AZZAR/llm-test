// Simple LRU Cache implementation
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.keyTimestamps = new Map();
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
    return this.cache.get(key);
  }

  // Set a value in cache
  set(key, value) {
    // If we're at capacity, remove the least recently used item
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    // Add the new item
    this.cache.set(key, value);
    this.keyTimestamps.set(key, Date.now());
  }

  // Remove the least recently used item
  evictLRU() {
    if (this.cache.size === 0) return;
    
    let oldestKey = null;
    let oldestTime = Infinity;
    
    // Find the oldest item by timestamp
    for (const [key, timestamp] of this.keyTimestamps.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestKey = key;
      }
    }
    
    // Remove the oldest item
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.keyTimestamps.delete(oldestKey);
    }
  }

  // Clear the entire cache
  clear() {
    this.cache.clear();
    this.keyTimestamps.clear();
  }
}

// Create a global memory cache instance
const memoryCache = new LRUCache(50); // Cache up to 50 responses

export { LRUCache, memoryCache }; 