const mongoose = require('mongoose');

const vitalSignSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    bodyTemperature: Number,
    heartRate: Number,
    bloodPressure: String, // Example: "120/80"
    dateRecorded: {
        type: Date,
        default: Date.now
    },
    // Include other vital signs as necessary
});

const VitalSign = mongoose.model('VitalSign', vitalSignSchema);

module.exports = VitalSign;
