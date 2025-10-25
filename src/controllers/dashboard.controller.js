import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user?._id);

    const channelStats = await User.aggregate([
        {
            $match: {
                _id: userId
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videos"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
                pipeline: [{ $project: { _id: 1 } }] 
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "videos._id", 
                foreignField: "video",
                as: "totalLikes" 
            }
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                likesCount: { $size: "$totalLikes" }, 
                videosCount: { $size: "$videos" },
                viewsCount: { $sum: "$videos.views" }
            }
        },
        {
            $project: {
                username: 1, 
                email: 1,
                subscribersCount: 1,
                likesCount: 1,
                videosCount: 1,
                viewsCount: 1,
            }
        }
    ]);

    if (channelStats.length === 0) {
        throw new ApiError(404, "Channel not found");
    }

    return res.status(200).json(
        new ApiResponse(200, channelStats[0], "Channel Stats Fetched Successfully")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const userId=new mongoose.Types.ObjectId(req.user?._id)

    const publishedVideos=await User.aggregate([
        {
            $match: {
                _id: userId
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videos",
            }
        }, 
        {
            $unwind: "$videos"
        },
        {
            $replaceRoot: {
                newRoot: "$videos"
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, publishedVideos, "Videos fetched successfully")
    )
})

export {
    getChannelStats, 
    getChannelVideos
    }