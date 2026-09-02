const { body, valudationResult } = require('express-validator');

const express = require('express');
const app = express();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const connectToDatabase = require('../models/db');
const router = express.Router();
const dotenv = require('dotenv');
const pino = require('pino');  // Import Pino logger

const logger = pino();  // Create a Pino logger instance

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

router.post('/login', async (req, res) => {
    try {
        // Task 1: Connect to giftsdb in MongoDB through connectToDatabase in db.js
        const db = await connectToDatabase();

        // Task 2: Access MongoDB users collection
        const collection = db.collection("users");

        // Task 3: Check for user credentials in database
        const theUser = await collection.findOne({ email: req.body.email });

        // Task 7: Check if user exists; if found, process authentication, otherwise return not found
        if (theUser) {
            // Task 4: Check if the password matches the encrypted password and send appropriate message on mismatch
            let result = await bcryptjs.compare(req.body.password, theUser.password);
            if (!result) {
                logger.error('Passwords do not match');
                return res.status(404).json({ error: 'Wrong pasword' });
            }

            // Task 5: Fetch user details from database
            const userName = theUser.firstName;
            const userEmail = theUser.email;

            // Task 6: Create JWT authentication if passwords match with user._id as payload
            let payload = {
                user: {
                    id: theUser._id.toString(),
                },
            };

            const authtoken = jwt.sign(payload, JWT_SECRET);

            // Send successful response
            return res.json({ authtoken, userName, userEmail });
        } else {
            // Task 7: Send appropriate message if user not found
            logger.error('User not found');
            return res.status(404).json({ error: 'User not found' });
        }
    } catch (e) {
        logger.error(e);
        return res.status(500).send('Internal server error');
    }
});

router.put('/update', async (req, res) => {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
    logger.error('Validation errors in update request', errors.array())
    return res.status(400).json({ errors: errors.array() });
   }
try {
   const email = req.headers.email;

   if (!email) {
    logger.error('Email not found in the request headers');
    return res.status(400).json({ error: "Email not found in the request headers" });
   }
    const db = await connectToDatabase();
    const collection = db.collection("users");
    const existingUser = await collection.findOne({ email });

    existingUser.updatedAt = new Date();

   const updatedUser = await collection.findOneAndUpdate(
    { email },
    { $set: existingUser },
    { returnDocument: 'after' }
   );
    const payload = {
        user: {
            id: updatedUser._id.toString(),
        },
    };

    const authtoken = jwt.sign(payload, JWT_SECRET);
    res.json({authtoken});
} catch (e) {
     return res.status(500).send('Internal server error');

}
});

module.exports = router;
