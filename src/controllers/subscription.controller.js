import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelName } = req.params;

    const channel = await User.findOne({
        username: channelName?.toLowerCase()
    });

    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    const channelId = channel._id;
    const userId = req.user?._id;

    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(401, "User not authenticated or invalid user id");
    }

    const isSubscribed = await Subscription.findOne({
        subscriber: userId,
        channel: channelId
    });

    if (isSubscribed) {
        const deleteResult = await Subscription.deleteOne({
            subscriber: userId,
            channel: channelId,
        });

        if (deleteResult.deletedCount === 0) {
            throw new ApiError(500, "Unsubscription failed. Record not deleted.");
        }

        return res.status(200).json(
            new ApiResponse(200, { isSubscribed: false }, "Channel Unsubscribed Successfully")
        );
    } else {
        const subscription = await Subscription.create({
            subscriber: userId,
            channel: channelId,
        });

        if (!subscription) {
            throw new ApiError(500, "Subscription failed. Could not create record.");
        }

        return res.status(200).json(
            new ApiResponse(200, { isSubscribed: true }, "Channel Subscribed Successfully")
        );
    }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelName} = req.params
    const channel=await User.findOne({
        username: channelName?.toLowerCase()
    })

    if(!channel){
        throw new ApiError(404, "No channel found")
    }

    const channelId=channel?._id

    const subscriberList=await Subscription.aggregate([
        {
            $match:{
                channel: channelId,
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
                pipeline: [
                    {
                        $project:{
                            fullname: 1,
                            email: 1,
                            username: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscriberDetails"
        },
        {
            $replaceRoot: {
                newRoot: "$subscriberDetails"
            }
        }
    ])

    if(!subscriberList || subscriberList.length===0){
        return res.status(200).json(
            new ApiResponse(200, [], "No subscribers fetched")
        )
    }

    return res.status(200).json(
        new ApiResponse(200, subscriberList, "Subscribers fetched successfully")
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const userId=req.user?._id
    if(!userId || !isValidObjectId(userId)){
        throw new ApiError(404, "No user found or Invalid user id")
    }

    const subscribedChannels=await Subscription.aggregate([
        {
            $match: {
                subscriber: userId
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedList",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1,
                            coverImage:1 
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscribedList"
        },
        {
            $replaceRoot: {
                newRoot: "$subscribedList"
            }
        }      
    ])

    return res.status(200).json(
        new ApiResponse(200, subscribedChannels, "Subscribed Channels Fetched successfully")
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}