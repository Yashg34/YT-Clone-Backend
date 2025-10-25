import { Router } from 'express';
import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription,
} from "../controllers/subscription.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/c/:channelName").post(toggleSubscription);
router.route("/c").get(getSubscribedChannels)
router.route("/u/:channelName").get(getUserChannelSubscribers);

export default router