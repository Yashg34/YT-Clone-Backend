// require('dotenv').config({path: './env'})
import dotenv from 'dotenv'
dotenv.config({
    path: './.env'
})


import connectDB from "./db/index.js"
import { app } from './app.js'
connectDB()
.then(()=>{
    app.get('/',(req,res)=>{
        res.send("Hi")
    })
    app.listen(process.env.PORT,()=>{
        console.log(`Server running at port : ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("MONGODB connection failed: ", err)
    process.exit(1)
})

/*
import mongoose from "mongoose"
import { DB_NAME } from "./constants"

import express from "express"

const app=express()

IIFE, immediately invoked function expression

( async ()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("Error: ", error)
            throw error
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`)
        })
    }catch(error){
        console.error("Error: ",error);
        throw error
    }
})()
*/