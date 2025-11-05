import { ApiError } from '../utils/ApiError.js'; 

const errorMiddleware = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error. Something went wrong.";

    if (err instanceof ApiError) {
        return res.status(statusCode).json({
            statusCode: statusCode,
            success: false,
            message: message,
            errors: err.errors || [] 
        });
    }
    
    if (err.name === 'ValidationError') {
        message = `Data validation failed: ${Object.values(err.errors).map(el => el.message).join(', ')}`;
        return res.status(400).json({
            statusCode: 400,
            success: false,
            message: message,
            errors: Object.values(err.errors).map(el => el.message)
        });
    }
    return res.status(statusCode).json({
        statusCode: statusCode,
        success: false,
        message: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
};

export { errorMiddleware };