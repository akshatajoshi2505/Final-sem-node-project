const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RestaurantsSchema = new Schema({
    name: String,
    borough: String,
    cuisine: String,
    address: {
        building: String,
        coord: [Number],
        street: String,
        zipcode: String
    },
    grades: [{
        date: Date,
        grade: String,
        score: Number
    }],
    restaurant_id: String
});

module.exports = mongoose.model("Restaurants", RestaurantsSchema);
