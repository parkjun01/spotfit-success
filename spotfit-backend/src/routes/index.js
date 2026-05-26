const router = require('express').Router();
const { authenticate, requirePremium } = require('../middleware/auth');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const spotController = require('../controllers/spotController');
const evaluationController = require('../controllers/evaluationController');
const rankingController = require('../controllers/rankingController');
const paymentController = require('../controllers/paymentController');

// Auth
router.post('/auth/verify-phone', authController.verifyPhone);
router.post('/auth/refresh', authController.refreshToken);
router.get('/auth/check-nickname/:nickname', authController.checkNickname);
router.delete('/auth/withdraw', authenticate, authController.withdraw);
router.post('/auth/fcm-token', authenticate, authController.saveFcmToken);

// Users
router.get('/users/me', authenticate, userController.getMe);
router.patch('/users/me', authenticate, userController.updateMe);
router.get('/users/me/spots', authenticate, userController.getMySpots);
router.get('/users/:id', authenticate, userController.getUserProfile);

// Spots
router.get('/spots', spotController.getSpots);
router.get('/spots/:id', spotController.getSpotById);
router.post('/spots', authenticate, spotController.createSpot);
router.patch('/spots/:id', authenticate, spotController.updateSpot);
router.delete('/spots/:id', authenticate, spotController.cancelSpot);
router.post('/spots/:id/join', authenticate, spotController.joinSpot);
router.delete('/spots/:id/join', authenticate, spotController.leaveSpot);

// Evaluations & Reports
router.get('/evaluations/pending', authenticate, evaluationController.getPendingEvaluations);
router.post('/evaluations', authenticate, evaluationController.submitEvaluation);
router.post('/reports', authenticate, evaluationController.submitReport);

// Rankings & Meta
router.get('/rankings', rankingController.getRankings);
router.get('/rankings/me', authenticate, rankingController.getMyRanking);
router.get('/sports', rankingController.getSports);
router.get('/tags', rankingController.getTags);

// Payments (Premium)
router.get('/payments/status', authenticate, paymentController.getSubscriptionStatus);
router.post('/payments/confirm', authenticate, paymentController.confirmPayment);
router.post('/payments/cancel', authenticate, paymentController.cancelSubscription);

// Health check
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

module.exports = router;
