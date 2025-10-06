# Queue Storage Test

Quick verification that IndexedDB persistence works correctly.

```bash
# In browser console after adding some videos to queue:

// Check stored items
await queueStorage.getStoredItems()

// Clear all stored data
await queueStorage.clear()

// Test storage of a single item
const testFile = new File(['test'], 'test.mp4', { type: 'video/mp4' })
await queueStorage.storeItem({
  id: 'test-123',
  file: testFile,
  status: 'pending',
  progress: 0,
  sizeBytes: 4,
  createdAt: Date.now()
})

// Verify it was stored
const items = await queueStorage.getStoredItems()
console.log('Stored items:', items)
```

## Test Persistence Flow

1. Add videos to queue
2. Refresh page
3. Verify videos are restored
4. Check that completed uploads are cleaned up
5. Verify old items (>7 days) are purged
