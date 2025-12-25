const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  complaintText: {
    type: String,
    required: true
  },
  uploadTime: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model("Complaint", complaintSchema);
