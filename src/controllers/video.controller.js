import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType } = req.query;
    // Get the ID of the currently authenticated user
    const currentUserId = req.user?._id; 

    const pipeline = [];

    // 1. Access Control / isPublished Filter (THE CRITICAL CHANGE)
    // Videos must be published (public view) OR owned by the current user (dashboard view).
    pipeline.push({ 
        $match: {
            $or: [
                { isPublished: true },
                { owner: new mongoose.Types.ObjectId(currentUserId) } 
            ]
        }
    });

    // 2. Search filter for title/description
    if (query) {
        pipeline.push({
            $match: {
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } }
                ]
            }
        });
    }

    // 3. Lookup Owner Details (Remains the same)
    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [{ $project: { username: 1, fullName: 1, avatar: 1 } }]
        }
    }, { $unwind: "$owner" });

    // 4. Sorting (Remains the same)
    const sort = {};
    const sortValue = (sortType === "asc" || sortType === "1") ? 1 : -1;
    if (sortBy) {
        sort[sortBy] = sortValue;
    } else {
        sort.createdAt = -1;
    }
    pipeline.push({ $sort: sort });

    // 5. Pagination Execution (Remains the same)
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        customLabels: { docs: "videos" },
    };

    const videoAggregate = Video.aggregate(pipeline);
    const result = await Video.aggregatePaginate(videoAggregate, options);

    return res.status(200).json(
        new ApiResponse(200, result, "Videos fetched successfully")
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if(
        [title, description].some((field)=>
            field?.trim()===""    
        )
    ){
        throw new ApiError(400, "All fields are required");
    }

    const userId=req.user?._id
    if(!userId){
        throw new ApiError(401,"No user provided")
    }
    
    const videoLocalPath=req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath=req.files?.thumbnail?.[0]?.path

    if(!videoLocalPath || !thumbnailLocalPath){
        throw new ApiError(400, "Video and Thumbnail are required")
    }

    const video=await uploadOnCloudinary(videoLocalPath)
    const thumbnail= await uploadOnCloudinary(thumbnailLocalPath)
    if(!video || !thumbnail){
        throw new ApiError(409, "Video and Thumbnail are not uploaded on Cloudinary")
    }

    const createdvideo=await Video.create({
        videoFile: video.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration: video.duration.toFixed(2),
        owner: userId
    })

    if(!createdvideo){
        throw new ApiError(500, "Something went wrong while creating the video")
    }

    return res.status(201).json(
        new ApiResponse(200, createdvideo, "Video created successfully")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId=req.user?._id
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }
    
    const video=await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
                $or: [{isPublished: true}, {owner: new mongoose.Types.ObjectId(userId)}]
            }
        }, 
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    { $project : 
                        {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        }
    ])

    if(!video || video.length===0){
        throw new ApiError(404, "Video not found")
    }
    await Video.findByIdAndUpdate(videoId, 
        {
            $inc: {
                views: 1
            }
        }
    )

    return res.status(200).json(
        new ApiResponse(200, video[0], "Video fetched successfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const {title, description}= req.body
    const userId=req.user?._id
    
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video ID")
    }

    const video=await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    if(video.owner.toString()!==userId.toString()){
        throw new ApiError(403, "You are not authorized to update this video")
    }
    
    const updatedFields={}
    if(title){
        updatedFields.title=title.trim()
    }
    if(description){
        updatedFields.description=description.trim()
    }

    const thumbnailLocalPath=req.file?.path
    if(thumbnailLocalPath){
        const thumbnail=await uploadOnCloudinary(thumbnailLocalPath)
        if(thumbnail && thumbnail.url){
            updatedFields.thumbnail=thumbnail.url
            await deleteFromCloudinary(video.thumbnail) 
        }else{
            throw new ApiError(500, "Thumbnail upload failed");
        }   
    }
    if(Object.keys(updatedFields).length===0){
        return res.status(200).json(
            new ApiResponse(200, video, "No valid fields provided")
        )
    }

    const updatedVideo=await Video.findByIdAndUpdate(videoId,
        {
            $set: updatedFields
        },
        {
            new: true
        }
    )

    if(!updatedVideo){
        throw new ApiError(500, "Video not found or update failed")
    }
    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video updated successfully")
    )

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId=req.user?._id
    console.log(videoId)
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video ID")
    }

    const video=await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    if((video.owner.toString()) !== (userId.toString())){
        throw new ApiError(403, "You are not authorized to delete this video")
    }

    const deletedVideo=await Video.findByIdAndDelete(videoId)
    await deleteFromCloudinary(video.videoFile)
    await deleteFromCloudinary(video.thumbnail)

    if(!deletedVideo){
        throw new ApiError(500, "Video deletion process not executed")
    }

    return res.status(200).json(
        new ApiResponse(200, {deletedVideoId: videoId}, "Video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user?._id;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }
    
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    if (video.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not authorized to change the status of this video");
    }

    const newPublishStatus = !video.isPublished;
    const updatedStatus = await Video.findByIdAndUpdate(videoId,
        {
            $set: {
                isPublished: newPublishStatus,
            }
        },
        { new: true }
    );

    if (!updatedStatus) {
        throw new ApiError(500, "Failed to update publish status");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedStatus, `Status toggled to ${newPublishStatus ? 'Published' : 'Unpublished'} successfully`)
    );
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}