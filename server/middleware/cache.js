const NodeCache = require('node-cache');

// Create cache instance with TTL of 5 minutes
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false
});

// Cache middleware factory
const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from URL and query parameters
    const key = `${req.originalUrl || req.url}`;
    
    // Try to get cached response
    const cachedResponse = cache.get(key);
    
    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    // Store original res.json function
    const originalJson = res.json;
    
    // Override res.json to cache the response
    res.json = function(data) {
      // Cache successful responses only
      if (res.statusCode === 200) {
        cache.set(key, data, duration);
      }
      
      // Call original json function
      originalJson.call(this, data);
    };

    next();
  };
};

// Cache invalidation helpers
const invalidateCache = (pattern) => {
  const keys = cache.keys();
  const keysToDelete = keys.filter(key => key.includes(pattern));
  
  keysToDelete.forEach(key => {
    cache.del(key);
  });
  
  console.log(`Invalidated ${keysToDelete.length} cache entries matching: ${pattern}`);
};

const invalidateUserCache = (userId) => {
  invalidateCache(`/api/user/getuser/${userId}`);
  invalidateCache('/api/user/getallusers');
};

const invalidateDoctorCache = (doctorId) => {
  invalidateCache(`/api/doctor/${doctorId}`);
  invalidateCache('/api/doctor/getalldoctors');
};

const invalidateAppointmentCache = (userId, doctorId) => {
  invalidateCache('/api/appointment');
  if (userId) invalidateCache(`user/${userId}`);
  if (doctorId) invalidateCache(`doctor/${doctorId}`);
};

// Clear specific cache key
const clearCacheKey = (key) => {
  cache.del(key);
  console.log(`Cache cleared for key: ${key}`);
};

// Clear all cache
const clearCache = () => {
  cache.flushAll();
  console.log('All cache cleared');
};

// Get cache statistics
const getCacheStats = () => {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    ksize: cache.getStats().ksize,
    vsize: cache.getStats().vsize
  };
};

module.exports = {
  cache,
  cacheMiddleware,
  invalidateCache,
  invalidateUserCache,
  invalidateDoctorCache,
  invalidateAppointmentCache,
  clearCache,
  getCacheStats
};
