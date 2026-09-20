const mongoose = require('mongoose');
const { isLiveMongo, store } = require('./adapter');

const maintenanceLogSchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  assetTag: String,
  serviceDate: {
    type: Date,
    default: Date.now
  },
  serviceType: String,
  cost: Number,
  technician: String,
  nextServiceDue: Date,
  notes: String,
  status: String,
  loggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MongooseMaintenance = mongoose.models.MaintenanceLog || mongoose.model('MaintenanceLog', maintenanceLogSchema);

class MaintenanceLogProxy {
  static find(query = {}) {
    if (isLiveMongo()) return MongooseMaintenance.find(query);
    let list = [...store.memoryLogs];
    if (query.asset) list = list.filter(l => l.asset.toString() === query.asset.toString());

    return {
      sort: (sortObj) => {
        return {
          limit: (n) => Promise.resolve(list.slice(0, n)),
          then: (resolve) => resolve(list.sort((a, b) => new Date(a.nextServiceDue) - new Date(b.nextServiceDue)))
        };
      },
      limit: (n) => Promise.resolve(list.slice(0, n)),
      then: (resolve) => resolve(list)
    };
  }

  static async create(docs) {
    if (isLiveMongo()) return MongooseMaintenance.create(docs);
    const docList = Array.isArray(docs) ? docs : [docs];
    const created = docList.map(doc => {
      const item = {
        _id: 'log_' + Math.random().toString(36).substring(2, 9),
        createdAt: new Date(),
        ...doc,
        save: async function() { return this; }
      };
      store.memoryLogs.unshift(item);
      return item;
    });
    return Array.isArray(docs) ? created : created[0];
  }

  static async deleteMany(query) {
    if (isLiveMongo()) return MongooseMaintenance.deleteMany(query);
    store.memoryLogs.length = 0;
    return { deletedCount: 0 };
  }

  constructor(doc) {
    if (isLiveMongo()) return new MongooseMaintenance(doc);
    this.doc = doc;
    this.save = async function() {
      const item = {
        _id: 'log_' + Math.random().toString(36).substring(2, 9),
        createdAt: new Date(),
        ...this.doc,
        save: async function() { return this; }
      };
      store.memoryLogs.unshift(item);
      return item;
    };
  }
}

module.exports = MaintenanceLogProxy;
