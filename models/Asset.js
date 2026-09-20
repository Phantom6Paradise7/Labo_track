const mongoose = require('mongoose');
const { isLiveMongo, store } = require('./adapter');

const assetSchema = new mongoose.Schema({
  assetTag: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    default: 'General Lab Equipment'
  },
  labLocation: {
    type: String,
    required: true,
    default: 'Lab A-12 (Main Hall)'
  },
  building: {
    type: String,
    default: 'BioScience Complex'
  },
  floor: {
    type: String,
    default: 'Floor 1'
  },
  room: {
    type: String,
    default: 'Room 101'
  },
  condition: {
    type: String,
    enum: ['Good', 'Fair', 'Poor', 'Repair', 'Decommissioned'],
    default: 'Good'
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  availableQuantity: {
    type: Number,
    required: true,
    default: 1
  },
  modelNumber: {
    type: String,
    default: ''
  },
  manufacturer: {
    type: String,
    default: ''
  },
  serialNumber: {
    type: String,
    default: ''
  },
  purchaseCost: {
    type: Number,
    default: 0
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    default: ''
  },
  specifications: {
    type: String,
    default: ''
  },
  supplier: {
    type: mongoose.Schema.Types.Mixed, // Supports ObjectId or String ID
    ref: 'User'
  },
  supplierName: {
    type: String,
    default: 'LaboTrack Verified Vendor'
  },
  isDecommissioned: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const MongooseAsset = mongoose.models.Asset || mongoose.model('Asset', assetSchema);

class AssetProxy {
  static find(query = {}) {
    if (isLiveMongo()) return MongooseAsset.find(query);

    let list = [...store.memoryAssets];

    if (query.$or) {
      list = list.filter(a => {
        return query.$or.some(cond => {
          for (const key of Object.keys(cond)) {
            const val = a[key] || '';
            if (cond[key] instanceof RegExp && cond[key].test(val)) return true;
          }
          return false;
        });
      });
    }

    if (query.category) list = list.filter(a => a.category === query.category);
    if (query.condition) list = list.filter(a => a.condition === query.condition);
    if (query.labLocation) list = list.filter(a => a.labLocation === query.labLocation);
    if (query.isDecommissioned !== undefined) list = list.filter(a => !!a.isDecommissioned === !!query.isDecommissioned);

    return {
      sort: (sortObj) => {
        return Promise.resolve(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      },
      then: (resolve) => resolve(list)
    };
  }

  static async findById(id) {
    if (!id) return null;
    if (isLiveMongo()) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        try {
          const item = await MongooseAsset.findById(id);
          if (item) return item;
        } catch (e) {}
      }
      try {
        const item = await MongooseAsset.findOne({ assetTag: id });
        if (item) return item;
      } catch (e) {}
    }
    return store.memoryAssets.find(a => (a._id && a._id.toString() === id.toString()) || a.assetTag === id) || null;
  }

  static async findOne(query) {
    if (isLiveMongo()) return MongooseAsset.findOne(query);
    if (query.assetTag) {
      return store.memoryAssets.find(a => a.assetTag && a.assetTag.toUpperCase() === query.assetTag.toUpperCase()) || null;
    }
    if (query._id) {
      return store.memoryAssets.find(a => a._id && a._id.toString() === query._id.toString()) || null;
    }
    let list = store.memoryAssets;
    for (const key of Object.keys(query)) {
      list = list.filter(a => a[key] === query[key]);
    }
    return list[0] || null;
  }

  static async create(docs) {
    if (isLiveMongo()) return MongooseAsset.create(docs);
    const docList = Array.isArray(docs) ? docs : [docs];
    const created = docList.map(doc => {
      const item = {
        _id: 'ast_' + Math.random().toString(36).substring(2, 9),
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function() { this.updatedAt = new Date(); return this; }
      };
      store.memoryAssets.unshift(item);
      return item;
    });
    return Array.isArray(docs) ? created : created[0];
  }

  static async findByIdAndUpdate(id, update, options = { new: true }) {
    if (isLiveMongo()) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        try {
          const res = await MongooseAsset.findByIdAndUpdate(id, update, options);
          if (res) return res;
        } catch (e) {}
      }
      try {
        const res = await MongooseAsset.findOneAndUpdate({ assetTag: id }, update, options);
        if (res) return res;
      } catch (e) {}
    }
    const asset = store.memoryAssets.find(a => (a._id && a._id.toString() === id.toString()) || a.assetTag === id);
    if (asset) {
      if (update.$inc) {
        for (const k of Object.keys(update.$inc)) {
          asset[k] = (asset[k] || 0) + update.$inc[k];
        }
      }
      if (update.$set) {
        Object.assign(asset, update.$set);
      } else {
        Object.assign(asset, update);
      }
      asset.updatedAt = new Date();
    }
    return asset;
  }

  static async findByIdAndDelete(id) {
    if (!id) return null;
    if (isLiveMongo()) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        try {
          const res = await MongooseAsset.findByIdAndDelete(id);
          if (res) return res;
        } catch (e) {}
      }
      try {
        const res = await MongooseAsset.findOneAndDelete({ assetTag: id });
        if (res) return res;
      } catch (e) {}
    }
    const idx = store.memoryAssets.findIndex(a => (a._id && a._id.toString() === id.toString()) || a.assetTag === id);
    if (idx !== -1) {
      return store.memoryAssets.splice(idx, 1)[0];
    }
    return null;
  }

  static async distinct(field) {
    if (isLiveMongo()) return MongooseAsset.distinct(field);
    const set = new Set(store.memoryAssets.map(a => a[field]).filter(Boolean));
    return Array.from(set);
  }

  static async deleteMany(query) {
    if (isLiveMongo()) return MongooseAsset.deleteMany(query);
    store.memoryAssets.length = 0;
    return { deletedCount: 0 };
  }

  constructor(doc) {
    if (isLiveMongo()) {
      const cleanDoc = { ...doc };
      if (cleanDoc.supplier && !mongoose.Types.ObjectId.isValid(cleanDoc.supplier)) {
        delete cleanDoc.supplier;
      }
      return new MongooseAsset(cleanDoc);
    }
    this.doc = doc;
    Object.assign(this, doc);
    this._id = 'ast_' + Math.random().toString(36).substring(2, 9);
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.save = async function() {
      const item = {
        ...this,
        updatedAt: new Date(),
        save: async function() { this.updatedAt = new Date(); return this; }
      };
      store.memoryAssets.unshift(item);
      return item;
    };
  }
}

module.exports = AssetProxy;
