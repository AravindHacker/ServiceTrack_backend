const express=require('express')
const mysql=require('mysql2')
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config(); 
const port = process.env.PORT || 3006; 


const app=express()

app.use(bodyParser.json());

app.use(cors());



const secretKey = 'mysecreatejwttokenkey'; 


// Serve static files from the 'public' directory
app.use('/public', express.static(path.join(__dirname, 'public')));


const db = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DB
  });

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to database.');
});


// Registration of Provider
app.post('/provireg', (req, res) => {
    const { name, email, password,contact,role,business_name , business_address ,service_categories , service_description,service_pricing , availability ,preferred_communication_channels } = req.body;

         // Insert new user
         const query = 'INSERT INTO providers (name, email, password, contact, role, business_name, business_address, service_categories, service_description, service_pricing, availability, preferred_communication_channels) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
         const values = [name, email, password, contact, role, business_name, business_address, service_categories, service_description, service_pricing, availability, preferred_communication_channels];
     
         db.query(query, values, (err, results) => {
             if (err) {
                 console.error('Database query error:', err);
                 return res.status(500).json({ error: 'Database query error', details: err.message });
             }
             res.status(201).json({ message: 'Provider registered successfully' });
             console.log('Insertion results:', results);
         });
    });


    app.get('/providers',(req,res)=>{
        db.query('SELECT * FROM providers',(err,results)=>{
            if(err){
                return res.status(500).json({error:err.message})
            }
            res.json(results)
        });
    });

   
//-------------------------------------------------------

// Registration of providers
app.post('/ownreg', (req, res) => {
    const { username, email, password,contact,address,role,pin_code} = req.body;

             // Insert new user
        db.query('INSERT INTO Owner (username, email, password,contact,address,role,pin_code) VALUES (?,?,?,?,?,?,?)', [username, email, password,contact,address,role,pin_code], (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'User registered successfully' });
            console.log(results)
        });
    });


    app.get('/owner/AllProviders',(req,res)=>{
        db.query('SELECT * FROM providers',(err,results)=>{
            if(err){
                return res.status(500).json({error:err.message})
            }
            res.json(results)
        });
    });    


    app.get('/AllOwner',(req,res)=>{
        db.query('SELECT * FROM Owner',(err,results)=>{
            if(err){
                return res.status(500).json({error:err.message})
            }
            res.json(results)
        });
    });    


//-------------------------------------------------------------

app.post('/login', (req, res) => {
    const { username, password ,role} = req.body;

    // First, try to find the user in the Owner table
    db.query('SELECT * FROM Owner WHERE username = ?', [username], (err, ownerResults) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (ownerResults.length === 0) {
            // If not found in Owner, try finding in Providers
            db.query('SELECT * FROM providers WHERE name = ?', [username], (err, providerResults) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                if (providerResults.length === 0) {
                    // User not found in either table
                    return res.status(401).json({ message: 'Invalid username or password' });
                }

                const provider = providerResults[0];

                // Compare provided password with stored plain text password for provider
                if (password === provider.password) {
                    // Password matches, create a token
                    const token = jwt.sign({ id: provider.id, role: 'provider' }, secretKey, { expiresIn: '1d' });

                    res.status(200).json({ message: 'Login successful', token ,role});
                } else {
                    // Password does not match
                    return res.status(401).json({ message: 'Invalid username or password' });
                }
            });
        } else {
            const owner = ownerResults[0];

            // Compare provided password with stored plain text password for owner
            if (password === owner.password) {
                // Password matches, create a token
                const token = jwt.sign({ id: owner.id, role: 'owner' }, secretKey, { expiresIn: '1d' });

                res.status(200).json({ message: 'Login successful', token ,role});
            } else {
                // Password does not match
                return res.status(401).json({ message: 'Invalid username or password' });
            }
        }
    });
});
  


//------------------------------------------------------------------
//getting all the user information
app.get('/userinfo',(req,res)=>{
    db.query('SELECT * FROM users',(err,results)=>{
        if(err){
            return res.status(500).json({error:err.message})
        }
        res.json(results)
    });
});

//putting more details
app.post('/userinfo/:id',(req,res)=>{
    const {id}=req.params
    const { phone_number,address,street,city,pin_code} = req.body;

    db.query('UPDATE users SET phone_number=?,address=?,street=?,city=?,pin_code=? where id=? ', [phone_number,address,street,city,pin_code,id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'user data not updated' });
        }
        res.status(201).json({ message: 'User Updated successfully' });
        console.log(results)
    });

});


//service requesting api
app.post('/request-service',  (req, res) => {
    const {
         vehicleMake, vehicleModel, year, vin, licensePlate,
        serviceType, description, preferredDate, preferredTime,
        serviceLocation, additionalComments,ownerId
    } = req.body;

    
    const query = `
        INSERT INTO servicerequests (
             vehicle_make, vehicle_model, year, vin, license_plate,
            service_type, description, preferred_date, preferred_time, 
            service_location, additional_comments,ownerId
        ) VALUES (  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
    `;

    db.query(query, [
         vehicleMake, vehicleModel, year, vin, licensePlate,
        serviceType, description, preferredDate, preferredTime,
        serviceLocation, additionalComments,ownerId
    ], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.send('Service request submitted successfully');
    });
});

//getting all the service information
app.get('/serviceinfo',(req,res)=>{
    db.query('SELECT * FROM servicerequests',(err,results)=>{
        if(err){
            return res.status(500).json({error:err.message})
        }
        res.json(results)
    });
});

//------------------------------------------------

app.post('/submit-request',(req,res)=>{
    const {
        vehicleMake, vehicleModel, licensePlate,
       serviceType,  preferredDate, preferredTime,
       serviceLocation,providerid,ownerId
   } = req.body;

   
   const query = `
       INSERT INTO servicereceived (
            vehicle_make, vehicle_model,   license_plate,
           service_type, preferred_date, preferred_time, 
           service_location,provider_id,owner_id
       ) VALUES (  ?, ?, ?, ?, ?, ?, ?, ?,?)
   `;

   db.query(query, [
        vehicleMake, vehicleModel,   licensePlate,
       serviceType,  preferredDate, preferredTime,
       serviceLocation,providerid,ownerId
   ], (err, result) => {
       if (err) {
           console.error(err);
           return res.status(500).send('Server error');
       }
       res.send('Service request submitted successfully');
   });
})



app.get('/receive-request',(req,res)=>{
    db.query('SELECT * FROM servicereceived',(err,results)=>{
        if(err){
            return res.status(500).json({error:err.message})
        }
        res.json(results)
    });
})

//----------------------------------------------------------------------------------

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/owner');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({
     storage,
     limits: {
        fileSize: 1024 * 1024 * 10, // Example: 10 MB limit
    },
     
 });

app.post('/upload', upload.single('profilePic'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }


    const ownerId = req.body.ownerId;
    const filePath = req.file.path.replace(/\\/g, '/');

    console.log('Received file:', req.file);
    console.log('Owner ID:', ownerId);
    console.log('File path:', filePath);

    const query = 'UPDATE Owner SET profile_pic_path = ? WHERE id = ?';
    db.query(query, [filePath, ownerId], (err, result) => {
        if (err) {
            console.error('Error updating profile picture path:', err);
            return res.status(500).send('Server error');
        }

    res.status(200).send({ filePath: req.file.path });
    });
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).send('File size limit exceeded.');
        }
    }
    next(err);
});


//---------------------------------------------------------------------------------------------

const storage2 = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/provider');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload2 = multer({
    storage: storage2,
    limits: {
        fileSize: 1024 * 1024 * 10, 
    },
});



app.post('/providerpics', upload2.single('provider-profilePic'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const providerId = req.body.ProviderId;
    const filePath = req.file.path.replace(/\\/g, '/');

    console.log('Received file:', req.file);
    console.log('Provider ID:', providerId);
    console.log('File path:', filePath);

    const query = 'UPDATE providers SET profile_pic_path = ? WHERE id = ?';
    db.query(query, [filePath, providerId], (err, result) => {
        if (err) {
            console.error('Error updating profile picture path:', err);
            return res.status(500).send('Server error');
        }

        res.status(200).send({ filePath: req.file.path });
    });
});


// Error handling middleware for multer file size limit exceeded
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).send('File size limit exceeded.');
        }
    }
    next(err);
});




//-----------------------------------------------------------------------------------------------


const nodemailer = require('nodemailer');

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    port: 534, // or 465 for secure SMTP
    secure: true,
    auth: {
      user: 'malotharavind16@gmail.com',
      pass: 'nglu mxzz lprz pnwp'
    }
});

// Function to send email using nodemailer
const sendEmail = (to, subject, text) => {
    const mailOptions = {
        from: 'malotharavind16@gmail.com',
        to: to,
        subject: subject,
        text: text
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
};

// Function to fetch email by user ID and table
const getEmailById = (userId, table, callback) => {
    const emailQuery = `SELECT email FROM ${table} WHERE id = ?`;
    db.query(emailQuery, [userId], (err, results) => {
        if (err) {
            console.error(`Error fetching email from ${table} table:`, err);
            callback(err, null);
        } else if (results.length > 0) {
            callback(null, results[0].email);
        } else {
            callback(`No email found for ID ${userId} in ${table} table`, null);
        }
    });
};

// Endpoint to create appointments
app.post('/appointments', (req, res) => {
    const { ownerId, providerId, appointmentDate,appointmentTime, serviceDetails ,vehicleMake,vehicleModel,licensePlate,serviceType} = req.body;

    const appointmentQuery = 'INSERT INTO Appointments (owner_id, provider_id, appointment_date,appointment_time, service_details,vehicle_make,vehicle_model,license_plate,service_type) VALUES (?,?,?,?,?, ?, ?, ?,?)';
    
    db.query(appointmentQuery, [ownerId, providerId, appointmentDate, appointmentTime,serviceDetails,vehicleMake,vehicleModel,licensePlate,serviceType], (err, result) => {
        if (err) {
            console.error('Error creating appointment:', err);
            return res.status(500).send('Server error');
        }
        
        const appointmentId = result.insertId;
        const reminderQuery = 'INSERT INTO Reminders (appointment_id, user_id, reminder_time, message) VALUES (?, ?, ?, ?)';
        const reminderTime = new Date(appointmentDate);
        reminderTime.setHours(reminderTime.getHours() - 24); // Set reminder 24 hours before

        const createReminderAndSendEmail = (userId, userType, message) => {
            db.query(reminderQuery, [appointmentId, userId, reminderTime, message], (err, result) => {
                if (err) {
                    console.error('Error creating reminder:', err);
                    return res.status(500).send('Server error');
                }
                
                // Fetch user's email from corresponding table
                const userTable = userType === 'Owner' ? 'Owner' : 'providers';
                getEmailById(userId, userTable, (err, userEmail) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    
                    sendEmail(userEmail, 'Appointment Reminder', message);
                });
            });
        };

              r
                const ownerMessage = `
                Dear Owner,
                This is a reminder for your upcoming appointment.
                Appointment Date: ${appointmentDate}
                Appointment Time: ${appointmentTime}
                Service Details: ${serviceDetails}
                Vehicle: ${vehicleMake} ${vehicleModel} (License Plate: ${licensePlate})
                Service Type: ${serviceType}
                Please ensure your vehicle is ready for the service.
            `;
    
            const providerMessage = `
                Dear Provider,
                This is a reminder for an upcoming appointment.
                Appointment Date: ${appointmentDate}
                Appointment Time: ${appointmentTime}
                Service Details: ${serviceDetails}
                Vehicle: ${vehicleMake} ${vehicleModel} (License Plate: ${licensePlate})
                Service Type: ${serviceType}
                Please ensure you are prepared for the service.
            `;
    
            createReminderAndSendEmail(ownerId, 'Owner', ownerMessage);
            
            createReminderAndSendEmail(providerId, 'providers', providerMessage);
    

        res.status(200).send('Appointment and reminders created successfully');
    });
});

// Function to send reminder email
const sendReminderEmail = (reminder) => {
    const reminderTime = new Date(reminder.reminder_time);
    
    // Check if reminder time is past current time
    if (reminderTime <= new Date()) {
        const userId = reminder.user_id;
        
        // Determine if user is an owner or provider
        const userTypeQuery = `
            SELECT 'Owner' AS table_name FROM Owner WHERE id = ?
            UNION
            SELECT 'providers' AS table_name FROM providers WHERE id = ?
        `;

        db.query(userTypeQuery, [userId, userId], (err, results) => {
            if (err) {
                console.error('Error determining user type:', err);
                return;
            }

            if (results.length > 0) {
                const userTable = results[0].table_name;
                getEmailById(userId, userTable, (err, userEmail) => {
                    if (err) {
                        console.error(err);
                        return;
                    }

                    sendEmail(userEmail, 'Reminder', reminder.message);

                    // Update reminder status in the database
                    const updateQuery = 'UPDATE Reminders SET is_sent = TRUE WHERE id = ?';
                    db.query(updateQuery, [reminder.id], (err, result) => {
                        if (err) {
                            console.error('Error updating reminder status:', err);
                        }
                    });
                });
            }
        });
    }
};

// Schedule cron job to send reminders every minute
cron.schedule('* * * * *', () => {
    const now = new Date();
    const query = 'SELECT * FROM Reminders WHERE reminder_time <= ? AND is_sent = FALSE';
    db.query(query, [now], (err, reminders) => {
        if (err) {
            console.error('Error fetching reminders:', err);
            return;
        }
        
        reminders.forEach(reminder => sendReminderEmail(reminder));
    });
});


//------------------------------------------------------------------------------------------------
const moment = require('moment-timezone');

app.get('/Allappointments', (req, res) => {
    db.query('SELECT * FROM Appointments', (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Convert appointment_date to Asia/Kolkata time zone
        const formattedResults = results.map(appointment => ({
            ...appointment,
            appointment_date: moment(appointment.appointment_date).tz('Asia/Kolkata').format('YYYY-MM-DD')
        }));

        res.json(formattedResults);
    });
});

//--------------------------------------------------------------------------------------------------------

app.post('/update-status', (req, res) => {
    const { status, serviceId, ownerId, providerId } = req.body;

    // Check if there's an existing entry for this serviceId, ownerId, and providerId
    const selectQuery = 'SELECT * FROM service_status_updates WHERE serviceId = ? AND owner_id = ? AND provider_id = ?';
    db.query(selectQuery, [serviceId, ownerId, providerId], (err, results) => {
        if (err) {
            console.error('Error selecting from ServiceRequests:', err);
            return res.status(500).send('Server error');
        }

        const updateOrInsertStatus = () => {
            if (results.length === 0) {
                // No existing entry, insert new data
                const insertQuery = 'INSERT INTO service_status_updates (serviceId, owner_id, status, provider_id) VALUES (?, ?, ?, ?)';
                db.query(insertQuery, [serviceId, ownerId, 'pending', providerId], (err, result) => {
                    if (err) {
                        console.error('Error inserting into service_status_updates:', err);
                        return res.status(500).send('Server error');
                    }

                    console.log('New entry inserted into service_status_updates');
                    res.status(200).send('New entry inserted into service_status_updates');
                });
            } else {
                // Update existing entry
                const updateQuery = 'UPDATE service_status_updates SET status = ? WHERE serviceId = ? AND owner_id = ? AND provider_id = ?';
                db.query(updateQuery, [status, serviceId, ownerId, providerId], (err, result) => {
                    if (err) {
                        console.error('Error updating status:', err);
                        return res.status(500).send('Server error');
                    }

                    console.log('Status updated successfully');

                    if (status === 'completed') {
                        sendCompletionEmail(ownerId);
                    }

                    res.status(200).send('Status updated successfully');
                });
            }
        };

        const sendCompletionEmail = (ownerId) => {
            const ownerQuery = 'SELECT email FROM Owner WHERE id = ?';
            db.query(ownerQuery, [ownerId], (err, results) => {
                if (err) {
                    console.error('Error fetching Owner email:', err);
                    return res.status(500).send('Server error');
                }

                if (results.length === 0) {
                    console.error('Owner not found');
                    return res.status(404).send('Owner not found');
                }

                const ownerEmail = results[0].email;
                sendEmail(ownerEmail);
            });
        };

        const sendEmail = (recipientEmail) => {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                port: 534,
                secure: true,
                auth: {
                  user: 'malotharavind16@gmail.com',
                  pass: 'nglu mxzz lprz pnwp'
                }
            });

            const mailOptions = {
                from: 'malotharavind16@gmail.com',
                to: recipientEmail,
                subject: 'Service Completed',
                text:  `
                Dear Owner,

                Your service request has been completed. Please pick up your vehicle at your earliest convenience.

                Service Details:
                - Service ID: ${serviceDetails.id}
                - Service Type: ${serviceDetails.service_type}
                - Vehicle: ${serviceDetails.vehicle_make} ${serviceDetails.vehicle_model} (License Plate: ${serviceDetails.license_plate})
                - Service Description: ${serviceDetails.description}

                We hope you are satisfied with our service.
                Thank you for choosing our service!

            `

            };

            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error('Error sending email:', err);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
        };

        updateOrInsertStatus();
    });
});




//----------------------------------------------------------------------------------------------
app.get('/All-update-status',(req,res)=>{
    db.query('SELECT * FROM service_status_updates',(err,results)=>{
        if(err){
            return res.status(500).json({error:err.message})
        }
        res.json(results)
    });
})

//-------------------------------------------------------------------------------------------------------------------------
app.post('/reviews', (req, res) => {
    const { profile_pic, owner_name, owner_id, provider_id, service_id, review, rating } = req.body;
  
    // Verify credentials (this should be more robust in a real application)
    const verifyQuery = 'SELECT * FROM Owner WHERE id = ? AND username = ?';
    db.query(verifyQuery, [owner_id, owner_name], (err, results) => {
      if (err) {
        console.error('Error verifying owner:', err);
        return res.status(500).send('Server error');
      }
  
      if (results.length === 0) {
        return res.status(401).send('Unauthorized');
      }
  
      // Insert review into the database
      const insertReviewQuery = 'INSERT INTO reviews (profile_pic, owner_name, owner_id, provider_id, service_id, review, rating) VALUES (?, ?, ?, ?, ?, ?, ?)';
      db.query(insertReviewQuery, [profile_pic, owner_name, owner_id, provider_id, service_id, review, rating], (err, result) => {
        if (err) {
          console.error('Error inserting review:', err);
          return res.status(500).send('Server error');
        }
  
        console.log('Review submitted successfully');
        res.status(200).send('Review submitted successfully');
      });
    });
  });
  


  app.get('/All-reviews&rating',(req,res)=>{
    db.query('SELECT * FROM reviews',(err,results)=>{
        if(err){
            return res.status(500).json({error:err.message})
        }
        res.json(results)
    });
})

//-----------------------------------------------------------------------------------------------------------------


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
