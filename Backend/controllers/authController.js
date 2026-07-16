const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const register = async (req,res) => {
    try{
        const{ name, email, password } = req.body;

        if(!name || !email || !password){
            return res.status(400).json({
                message: "Please fill all fields"
            });
        }
        
        if (name.length < 3) {
            return res.status(400).json({
                message: "Name must be at least 3 characters"
            });
        }
     
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }

        const existingUser = await User.findOne({email});

        if(existingUser){
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(password,salt);

        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({
            message: "Registration Successful"
        });
    }catch(error){
        res.status(500).json({
            message: error.message
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Please fill all fields"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { id: user._id ,
              role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        res.status(200).json({
            message: "Login Successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const anonymousLogin = async (req, res)=>{
    try{
        const anonymousId = "ANON" + Date.now();

        const anonymousUser = await User.create({
            anonymousId,
            isAnonymous: true,
            role:"student"
        });

        const token = jwt.sign(
            {
                id: anonymousUser._id,
                role: anonymousUser.role,
                isAnonymous: true
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(201).json({
            message: "Anonymous login successful",
            token,
            user: {
                id: anonymousUser._id,
                anonymousId: anonymousUser.anonymousId,
                role: anonymousUser.role,
                isAnonymous:true
            }
        });
    }catch(error){
        console.log("Anonymous Login Error:",error);
        res.status(500).json({
            message: error.message,
            error
        });
    }
}
module.exports = { register, login, anonymousLogin }; 