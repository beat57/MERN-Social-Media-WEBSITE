import { User } from "../models/userSchema.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

export const Register = async (req, res) => {
    try {
        const { name, username, email, password } = req.body;

        // Basic validation
        if (!name || !username || !email || !password) {
            return res.status(400).json({
                message: "All fields are required.",
                success: false
            });
        }

        const existingUser  = await User.findOne({ email });
        if (existingUser ) {
            return res.status(409).json({
                message: "User  already exists.",
                success: false
            });
        }

        const hashedPassword = await bcryptjs.hash(password, 12); // Use a lower salt rounds for better performance

        await User.create({
            name,
            username,
            email,
            password: hashedPassword
        });

        return res.status(201).json({
            message: "Account created successfully.",
            success: true
        });

    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
}

export const Login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "All fields are required.",
                success: false
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: "Incorrect email or password.",
                success: false
            });
        }

        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                message: "Incorrect email or password.",
                success: false
            });
        }

        const tokenData = { userId: user._id };
        const token = jwt.sign(tokenData, process.env.TOKEN_SECRET, { expiresIn: "1d" });

        return res.cookie("token", token, { expires: new Date(Date.now() + 86400000), httpOnly: true }).status(200).json({
            message: `Welcome back ${user.name}`,
            user,
            success: true
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
}

export const logout = (req, res) => {
    return res.cookie("token", "", { expires: new Date(Date.now()) }).status(200).json({
        message: "User  logged out successfully.",
        success: true
    });
}

export const bookmark = async (req, res) => {
    try {
        const loggedInUserId = req.body.id;
        const tweetId = req.params.id;
        const user = await User.findById(loggedInUserId);

        if (!user) {
            return res.status(404).json({
                message: "User  not found.",
                success: false
            });
        }

        if (user.bookmarks.includes(tweetId)) {
            // Remove bookmark
            await User.findByIdAndUpdate(loggedInUserId, { $pull: { bookmarks: tweetId } });
            return res.status(200).json({
                message: "Removed from bookmarks."
            });
        } else {
            // Add bookmark
            await User.findByIdAndUpdate(loggedInUserId, { $push: { bookmarks: tweetId } });
            return res.status(200).json({
                message: "Saved to bookmarks."
            });
        }
    } catch (error) {
        console.error("Bookmark error:", error);
        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};

export const getMyProfile = async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findById(id).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User  not found.",
                success: false
            });
        }

        return res.status(200).json({
            user,
            success: true
        });
    } catch (error) {
        console.error("Get profile error:", error);
        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};

export const getOtherUsers = async (req, res) => {
    try {
        const { id } = req.params;
        const otherUsers = await User.find({ _id: { $ne: id } }).select("-password");

        if (!otherUsers.length) {
            return res.status(404).json({
                message: "Currently do not have any users.",
                success: false
            });
        }

        return res.status(200).json({
            otherUsers,
            success: true
        });
    } catch (error) {
        console.error("Get other users error:", error);
        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
}

export const follow = async (req, res) => {
    try {
        const loggedInUserId = req.body.id;
        const userId = req.params.id;

        const loggedInUser  = await User.findById(loggedInUserId);
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User  not found.",
                success: false
            });
        }

        if (!user.followers.includes(loggedInUserId)) {
            await user.updateOne({ $push: { followers: loggedInUserId } });
            await loggedInUser .updateOne({ $push: { following: userId } });
            return res.status(200).json({
                message: `${loggedInUser .name} just followed ${user.name}`,
                success: true
            });
        } else {
            return res.status(400).json({
                message: `User  already followed ${user.name}`,
                success: false
            });
        }
    } catch (error) {
        console.error("Follow error:", error);
        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
}

export const unfollow = async (req, res) => {
    try {
        const loggedInUserId = req.body.id;
        const userId = req.params.id;

        const loggedInUser  = await User.findById(loggedInUserId);
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User  not found.",
                success: false
            });
        }

        if (loggedInUser .following.includes(userId)) {
            await user.updateOne({ $pull: { followers: loggedInUserId } });
            await loggedInUser .updateOne({ $pull: { following: userId } });
            return res.status(200).json({
                message: `${loggedInUser .name} unfollowed ${user.name}`,
                success: true
            });
        } else {
            return res.status(400).json({
                message: `User  has not followed yet`,
                success: false
            });
        }
    } catch (error) {
        console.error("Unfollow error:", error);
        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
}
