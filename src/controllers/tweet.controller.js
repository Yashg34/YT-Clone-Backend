import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content}=req.body
    if(!content){
        throw new ApiError(400, "Content is required")
    }

    const userId=req.user?._id
    if(!isValidObjectId(userId)){
        throw new ApiError(401, "invalid user id")
    }

    const tweet=await Tweet.create({
        owner: userId,
        content
    })

    const createdTweet=await Tweet.findById(tweet._id)
    if(!createdTweet){
        throw new ApiError(500, "Tweet not created due to internal server error")
    }

    return res.status(201).json(
        new ApiResponse(201, createdTweet, "Tweet created successfully")
    )

})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId}=req.params

    if(!userId || !isValidObjectId(userId)){
        throw new ApiError(400, "No user provided or Invalid user Id")
    }

    const tweets=await Tweet.find({
        owner: new mongoose.Types.ObjectId(userId)
    })

    return res.status(200).json(
        new ApiResponse(200, tweets, 
            tweets.length>0 ? "Tweets fetched successfully" : "No tweets found"
        )
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId}=req.params
    const {content}=req.body

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid Tweet Id")
    }
    if(!content){
        throw new ApiError(400, "Content is required")
    }

    const tweet=await Tweet.findOneAndUpdate(
        {
            _id: tweetId,
            owner: req.user?._id
        }, 
        {
            $set: {content}
        },
        {new: true}
    )
    
    if(!tweet){
        const tweetExists=await Tweet.findById(tweetId)
        if(!tweetExists){
            throw new ApiError(404, "Tweet not found")
        }
        throw new ApiError(403, "User is not allowes to update this tweet")
    }

    return res.status(200).json(
        new ApiResponse(200, tweet, "tweet updated successfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId}=req.params
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid Tweet id")
    }

    const deletedTweet=await Tweet.findOneAndDelete(
        {
            _id: tweetId,
            owner: req.user?._id
        }        
    )
    
    if(deletedTweet){
        return res.status(200).json(
            new ApiResponse(200, {deletedTweetId: deletedTweet._id}, "tweet deleted successfully")
        )
    }else{
        const tweetExists = await Tweet.findById(tweetId);
        if (!tweetExists) {
            throw new ApiError(404, "Tweet not found.");
        } else {
            throw new ApiError(403, "You are not authorized to delete this tweet.");
        }
    }
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}