const mongoose = require('mongoose');
const { isLiveMongo, store } = require('./adapter');

const requestItemSchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'Asset',
    required: true
  },
  assetTag: String,
  assetName: String,
  quantity: {
    type: Number,
    default: 1
  }
}, { _id: false });

const issueRequestSchema = new mongoose.Schema({
  requestCode: {
    type: String,
    unique: true,
    required: true,
    default: () => 'REQ-' + Math.floor(100000 + Math.random() * 900000)
  },
  requester: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User',
    required: true
  },
  requesterName: String,
  requesterRole: String,
  items: [requestItemSchema],
  purpose: String,
  expectedReturnDate: Date,
  actualReturnDate: Date,
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Issued', 'Returned', 'Rejected'],
    default: 'Pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User'
  },
  reviewerName: String,
  rejectionReason: String,
  issuedAt: Date,
  returnCondition: {
    type: String,
    enum: ['OK', 'Damaged', 'Lost', 'Pending Triage'],
    default: 'Pending Triage'
  },
  returnNotes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const MongooseIssueRequest = mongoose.models.IssueRequest || mongoose.model('IssueRequest', issueRequestSchema);

class IssueRequestProxy {
  static find(query = {}) {
    if (isLiveMongo()) return MongooseIssueRequest.find(query);

    let list = [...store.memoryRequests];

    if (query.requester) {
      list = list.filter(r => r.requester.toString() === query.requester.toString());
    }
    if (query.status) {
      list = list.filter(r => r.status === query.status);
    }
    if (query['items.asset']) {
      list = list.filter(r => r.items && r.items.some(i => i.asset.toString() === query['items.asset'].toString()));
    }
    if (query.expectedReturnDate && query.expectedReturnDate.$lt) {
      list = list.filter(r => new Date(r.expectedReturnDate) < query.expectedReturnDate.$lt);
    }

    return {
      sort: (sortObj) => {
        return {
          limit: (n) => Promise.resolve(list.slice(0, n)),
          then: (resolve) => resolve(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
        };
      },
      limit: (n) => Promise.resolve(list.slice(0, n)),
      then: (resolve) => resolve(list)
    };
  }

  static async findById(id) {
    if (isLiveMongo()) return MongooseIssueRequest.findById(id);
    return store.memoryRequests.find(r => r._id.toString() === id.toString()) || null;
  }

  static async countDocuments(query = {}) {
    if (isLiveMongo()) return MongooseIssueRequest.countDocuments(query);
    let list = [...store.memoryRequests];
    if (query.status) list = list.filter(r => r.status === query.status);
    if (query.expectedReturnDate && query.expectedReturnDate.$lt) {
      list = list.filter(r => new Date(r.expectedReturnDate) < query.expectedReturnDate.$lt);
    }
    return list.length;
  }

  static async create(docs) {
    if (isLiveMongo()) return MongooseIssueRequest.create(docs);
    const docList = Array.isArray(docs) ? docs : [docs];
    const created = docList.map(doc => {
      const item = {
        _id: 'req_' + Math.random().toString(36).substring(2, 9),
        requestCode: doc.requestCode || 'REQ-' + Math.floor(100000 + Math.random() * 900000),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...doc,
        get isOverdue() {
          return this.status === 'Issued' && this.expectedReturnDate && new Date() > new Date(this.expectedReturnDate);
        },
        save: async function() { return this; }
      };
      store.memoryRequests.unshift(item);
      return item;
    });
    return Array.isArray(docs) ? created : created[0];
  }

  static async deleteMany(query) {
    if (isLiveMongo()) return MongooseIssueRequest.deleteMany(query);
    store.memoryRequests.length = 0;
    return { deletedCount: 0 };
  }

  constructor(doc) {
    if (isLiveMongo()) return new MongooseIssueRequest(doc);
    this.doc = doc;
    this.save = async function() {
      const item = {
        _id: 'req_' + Math.random().toString(36).substring(2, 9),
        requestCode: this.doc.requestCode || 'REQ-' + Math.floor(100000 + Math.random() * 900000),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...this.doc,
        get isOverdue() {
          return this.status === 'Issued' && this.expectedReturnDate && new Date() > new Date(this.expectedReturnDate);
        },
        save: async function() { return this; }
      };
      store.memoryRequests.unshift(item);
      return item;
    };
  }
}

module.exports = IssueRequestProxy;
