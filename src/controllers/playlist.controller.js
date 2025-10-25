import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { is } from "type-is"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    //TODO: create playlist
    if(!name || !description){
        throw new ApiError(400, "Name and Description are required")
    }

    const userId=req.user?._id
    if(!isValidObjectId(userId)){
        throw new ApiError(401, "Invalid id provided")
    }

    const playlist=await Playlist.create({
        name,
        description,
        videos: [],
        owner: userId
    })

    const createdPlaylist=await Playlist.findById(playlist._id)
    if(!createdPlaylist){
        throw new ApiError(500, "Playlist not created due to internal issue")
    }

    return res.status(201).json(
        new ApiResponse(201, playlist, "Playlist created successfully")
    )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!isValidObjectId(userId)){
        throw new ApiError(401, "Invalid user id")
    }

    const playlists=await  Playlist.find(
        {owner: userId}
    )

    return res.status(200).json(
        new ApiResponse(200, playlists,
            playlists.length > 0 ? "Playlists fetched successfully" : "No playlists found for this user"
        )
    )

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!isValidObjectId(playlistId)){
        throw new ApiError(401, "Invalid playlist Id")
    }

    const playlist=await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(404, "Playlist not found")
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, `Playlist with id: ${playlistId} fetched successfully`)
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Playlist and Video are required")
    }
    
    const userId=req.user?._id
    if(!isValidObjectId(userId)){
        throw new ApiError(401, "No user id provided")
    }

    const playlist= await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(404, "No playlist found")
    }

    if(playlist.owner.toString()!==userId.toString()){
        throw new ApiError(403, "User is not allowed to add video to this playlit")
    }

    const isVideoExist=playlist.videos.includes(new mongoose.Types.ObjectId(videoId))
    if(isVideoExist){
        throw new ApiError(409, "Video already exists in playlust")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: { videos: videoId } 
        },
        { new: true } 
    );
    if(!updatedPlaylist){
        throw new ApiError(500, "Video not added to the playlist")
    }

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully")
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Playlist and Video are required")
    }
    
    const userId=req.user?._id
    if(!isValidObjectId(userId)){
        throw new ApiError(401, "No user id provided")
    }

    const playlist= await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(404, "No playlist found")
    }
    
    if(playlist.owner.toString()!==userId.toString()){
        throw new ApiError(403, "User is not allowed to remove video from this playlit")
    }

    const isVideoExist=playlist.videos.includes(new mongoose.Types.ObjectId(videoId))
    if(!isVideoExist){
        throw new ApiError(404, "Video with the id provided doesnt exist in this playlist")
    }
    
    const updatedPlaylist= await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull : {videos: videoId}
        },
        {new: true}
    )

    if(!updatedPlaylist){
        throw new ApiError(500, "Video not deleted from playlist")
    }

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Video deleted from playlist successfully")
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

    const userId=req.user?._id
    if(!isValidObjectId(userId)){
        throw new ApiError(401, "No user id provided")
    }

    const playlist= await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(404, "No playlist found")
    }
    
    if(playlist.owner.toString()!==userId.toString()){
        throw new ApiError(403, "User is not allowed to delete this playlit")
    }
    
    const deletedPlaylist=await Playlist.findByIdAndDelete(playlistId)  
    if(!deletedPlaylist){
        throw new ApiError(500, "Playlist deletion execution not executed")
    }

    return res.status(200).json(
        new ApiResponse(200, {deletedPlaylistId: deletedPlaylist._id}, "Playlist deleted successfully")
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    const userId=req.user?._id
    if(!isValidObjectId(userId)){
        throw new ApiError(401, "No user id provided")
    }

    const playlist= await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(404, "No playlist found")
    }
    
    if(playlist.owner.toString()!==userId.toString()){
        throw new ApiError(403, "User is not allowed to update this playlist")
    }

    let updatedFields={}
    if(name) updatedFields.name=name
    if(description) updatedFields.description=description

    if(Object.keys(updatedFields).length===0){
        return res.status(200).json(
            new ApiResponse(200, playlist, "No valid fields provided")
        )
    }

    const updatedPlaylist=await Playlist.findByIdAndUpdate(playlistId,
        {$set: updatedFields},
        {new: true}
    )

    if(!updatedPlaylist){
        throw new ApiError(500, "Playlist not updated")
    }
    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}