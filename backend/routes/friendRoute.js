const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const friendController = require('../controllers/friendController');

const router = express.Router();

// All routes protected
router.use(authMiddleware);

router.post('/send-request', friendController.sendRequest);
router.delete('/cancel-request/:requestId', friendController.cancelRequest);
router.put('/accept-request/:requestId', friendController.acceptRequest);
router.delete('/decline-request/:requestId', friendController.declineRequest);
router.delete('/unfriend/:friendId', friendController.unfriend);

router.get('/sent-requests', friendController.getSentRequests);
router.get('/received-requests', friendController.getReceivedRequests);
router.get('/contacts', friendController.getMyFriends);
router.get('/all', friendController.getAllFriends);
router.get('/discover', friendController.getDiscoverUsers);

module.exports = router;
