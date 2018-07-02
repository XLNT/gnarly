'use strict';

import mongoose from 'mongoose';

const IPersistTransactionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    blockHash: { type: String, required: true },
    patches: [{
      id: { type: String, required: false },
      reason: { type: String, requied: false },
      operations: [{
        op: { type: String, required: false },
        path: { type: String, required: false },
        value: { type: String, required: false },
        volatile: { type: Boolean, required: false },
      }];
    }];
})

module.exports = IPersistTransactionSchema
