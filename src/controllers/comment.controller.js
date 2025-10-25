import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video Id")
    }

    const pipeline=[];
    
    pipeline.push({
        $match: {
            video: new mongoose.Types.ObjectId(videoId)
        }
    })
    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [
                {
                    $project: {
                        username: 1,
                        fullname: 1,
                        avatar: 1
                    }
                }
            ]
        }
    }, {$unwind: "$owner"})

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        customLabels: { docs: "comments" },
    };
    
    const commentAggregate = Comment.aggregate(pipeline);
    const result = await Comment.aggregatePaginate(commentAggregate, options);
    
        return res.status(200).json(
            new ApiResponse(200, result, "Comments fetched successfully")
        );
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const userId=req.user?._id
    const {videoId}=req.params
    if(!isValidObjectId(userId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid User Id or Video Id provided ")
    }

    const {content}=req.body
    if(!content.trim()){
        throw new ApiError(400, "Content field can not be empty")
    }

    const comment=await Comment.create({
        content,
        video: videoId,
        owner: userId
    })
    if(!comment){
        throw new ApiError(500, "Comment creation failed")
    }

    return res.status(201).json(
        new ApiResponse(201, comment, "Comment created successfully")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId}=req.params
    const userId=req.user?._id
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment Id")
    }

    const {content}=req.body
    if(!content){
        throw new ApiError(400, "Content field is required")
    }
    const updatedComment=await Comment.findOneAndUpdate(
        {
            _id: commentId,
            owner: userId,
        },
        {
            $set: {content}
        },
        {
            new: true
        }
    )
    if(!updatedComment){
        const commentExists=await Comment.findById(commentId)
        if(!commentExists){
            throw new ApiError(404, "Commment not found")
        }else{
            throw new ApiError(403, "You are not authorized to update this comment")
        }
    }

    return res.status(200).json(
        new ApiResponse(200, updatedComment, "Comment updated successfully")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId}=req.params
    const userId=req.user?._id
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment Id")
    }

    const deletedComment=await Comment.findOneAndDelete(
        {
            _id: commentId,
            owner: userId,
        }
    )
    if(!deletedComment){
        const commentExists=await Comment.findById(commentId)
        if(!commentExists){
            throw new ApiError(404, "Commment not found")
        }else{
            throw new ApiError(403, "You are not authorized to delete this comment")
        }
    }


    return res.status(200).json(
        new ApiResponse(200, {deletedCommentId: deletedComment._id}, "Comment deleted successfully")
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}