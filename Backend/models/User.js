const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    name:{
        type: String,
        trim: true,
    },
    
    email:{
        type: String,
        unique: true,
        sparse:true,
        lowercase: true,
        trim: true,
    },
    password:{
        type:String,
    },
    
    anonymousId:{
        type: String,
        default: null
    },

    isAnonymous:{
        type: Boolean,
        default: false
    },
    
    role:{
        type: String,
        enum: ["student", "admin","counsellor"],
        default: "student"
    }

    },{ timestamps:  true});

module.exports = mongoose.model("User", userSchema);