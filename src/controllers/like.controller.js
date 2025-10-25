import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    const userId=req.user?._id

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id")
    }
    
    const like=await Like.findOne(
        {video: videoId, likedBy: userId}
    )
    if(like){
        const deletedLike=await Like.findByIdAndDelete(like._id)
        if(!deletedLike){
            throw new ApiError(500, "Video disliked failed")
        }else{
            return res.status(200).json(
                new ApiResponse(200, {likeId:like._id} ,"Disliked the video successfully")
            )
        }
    }else{
        const createdLike=await Like.create({
            video: videoId,
            likedBy: userId
        })

        if(!createdLike){
            throw new ApiError(500, "Video liked failed")
        }else{
            return res.status(200).json(
                new ApiResponse(200, createdLike, "Liked the video successfully")
            )
        }
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    const userId=req.user?._id

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid Comment Id")
    }
    
    const like=await Like.findOne(
        {comment: commentId, likedBy: userId}
    )
    if(like){
        const deletedComment=await Like.findByIdAndDelete(like._id)
        if(!deletedComment){
            throw new ApiError(500, "Comment disliked failed")
        }else{
            return res.status(200).json(
                new ApiResponse(200, {likeId:like._id} ,"Disliked the comment successfully")
            )
        }
    }else{
        const createdLike=await Like.create({
            comment: commentId,
            likedBy: userId
        })

        if(!createdLike){
            throw new ApiError(500, "Comment liked failed")
        }else{
            return res.status(200).json(
                new ApiResponse(200, createdLike, "Liked the comment successfully")
            )
        }
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet

    const userId=req.user?._id

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet Id")
    }
    
    const like=await Like.findOne(
        {tweet: tweetId, likedBy: userId}
    )
    if(like){
        const deletedLike=await Like.findByIdAndDelete(like._id)
        if(!deletedLike){
            throw new ApiError(500, "Tweet disliked failed")
        }else{
            return res.status(200).json(
                new ApiResponse(200, {likeId:like._id} ,"Disliked the tweet successfully")
            )
        }
    }else{
        const createdLike=await Like.create({
            tweet: tweetId,
            likedBy: userId
        })

        if(!createdLike){
            throw new ApiError(500, "Tweet liked failed")
        }else{
            return res.status(200).json(
                new ApiResponse(200, createdLike, "Liked the tweet successfully")
            )
        }
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId=req.user?._id
    const likedVideos=await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId),
                video: { $exists: true, $ne: null }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $unwind: "$owner"
                    }
                ]
            }
        },
        {
            $unwind: "$videoDetails"
        },
        {
            $replaceRoot: {
                newRoot: "$videoDetails"
            }
        }
    ])

    if(!likedVideos ){
        throw new ApiError(500, "Liked videos not fetched due to server error")
    }
    return res.status(200).json(
        new ApiResponse(200, likedVideos,
            likedVideos.length>0 ? "Liked Videos Fetched Successfully":"No liked videos"
        )
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}