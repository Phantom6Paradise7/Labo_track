const mongoose = require('mongoose');
const { isLiveMongo, store } = require('./adapter');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  actorName: { type: String, required: true },
  actorRole: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: String,
  details: String,
  timestamp: { type: Date, default: Date.now }
});

const MongooseAudit = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

class AuditLogProxy {
  static find(query = {}) {
    if (isLiveMongo()) return MongooseAudit.find(query);
    let list = [...store.memoryAudit];
    return {
      sort: (sortObj) => {
        return {
          limit: (n) => Promise.resolve(list.slice(0, n)),
          then: (resolve) => resolve(list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)))
        };
      },
      limit: (n) => Promise.resolve(list.slice(0, n)),
      then: (resolve) => resolve(list)
    };
  }

  static async create(docs) {
    if (isLiveMongo()) return MongooseAudit.create(docs);
    const docList = Array.isArray(docs) ? docs : [docs];
    const created = docList.map(doc => {
      const item = {
        _id: 'aud_' + Math.random().toString(36).substring(2, 9),
        timestamp: new Date(),
        ...doc
      };
      store.memoryAudit.unshift(item);
      return item;
    });
    return Array.isArray(docs) ? created : created[0];
  }

  static async deleteMany(query) {
    if (isLiveMongo()) return MongooseAudit.deleteMany(query);
    store.memoryAudit.length = 0;
    return { deletedCount: 0 };
  }
}

module.exports = AuditLogProxy;
