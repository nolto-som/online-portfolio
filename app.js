// app.js
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');


const app = express();
app.set('view engine', 'ejs');

app.use(express.static('public'));

const port = 1234

app.listen(port, () =>{
    console.log(`Server is Running on port ${port}`);
})

const multer = require('multer');
const path = require('path');

app.use(bodyParser.urlencoded({ extended: true }));
// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images'); // Directory to save the uploaded images
    },
    filename: function (req, file, cb) {
        // Log the newImageName for debugging
        console.log("New image name from form:", req.body.newImageName);
        
        // Get the new image name from the form input
        const newImageName = req.body.newImageName ? req.body.newImageName.trim() : 'default-image-name';
        
        // Preserve the original file extension
        const extension = path.extname(file.originalname);
        
        // Use the new image name and log the final filename
        const finalImageName = `${newImageName}${extension}`;
        console.log("Final image name to be saved:", finalImageName);
        
        cb(null, finalImageName); // Save file with the new name
    }
});

const upload = multer({ storage: storage });

//connecting to database
let db;

function connectToDatabase() {
const db = mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
})
db.connect((err) =>{
    if(err){
        console.log('Database is not Connected:', err.message);
        setTimeout(connectToDatabase, 5000); // Retry after 5 seconds
    }else {
        console.log('Database is Connected...')
    }
})

db.on('error', (err) => {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('Connection lost, reconnecting...');
        connectToDatabase();
    } else {
        console.error('Database error:', err.message);
        throw err; // Unrecoverable error
    }
});
}

connectToDatabase();


// Routes
// Home Route
app.get('/', (req, res) => {
    res.render('home'); // Renders the home 
});

// Projects Route
app.get('/projects', (req, res) => {
    const sql = "SELECT * FROM projects WHERE description NOT LIKE '%Lorem ipsum%'";
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.render('projects', { projects: results });
    });
});

//

// View single Project
app.get('/project/:id', (req, res) => {
    const projectId = req.params.id;
    
    const query = 'SELECT * FROM projects WHERE id = ?';
    db.query(query, [projectId], (err, results) => {
        if (err) throw err;
        
        if (results.length > 0) {
            const project = results[0];
            res.render('project-detail', { project });
        } else {
            res.status(404).send('Project not found');
        }
    });
});

app.get('/add', (req, res) => {
    res.render('addProject');
});

// Handle project form submission with image upload
app.post('/add', upload.single('image'), (req, res) => {
    const { title, description, link } = req.body;
    const imagePath = req.file ? `${req.file.filename}` : null;

    // SQL to insert the new project
    const sql = 'INSERT INTO projects (title, description, link, image) VALUES (?, ?, ?, ?)';
    db.query(sql, [title, description, link, imagePath], (err) => {
        if (err) throw err;
        res.redirect('/projects'); // Redirect after successful insert
    });
});

// Route to display the edit form
app.get('/project/:id/edit', (req, res) => {
    const projectId = req.params.id;
    const query = 'SELECT * FROM projects WHERE id = ?';

    db.query(query, [projectId], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            res.render('edit-project', { project: results[0] });
        } else {
            res.status(404).send('Project not found');
        }
    });
});

// Route to update the project in the database
app.post('/project/:id/edit', (req, res) => {
    const projectId = req.params.id;
    const { title, description, link, image } = req.body;
    const query = 'UPDATE projects SET title = ?, description = ?, link = ?, image = ? WHERE id = ?';

    db.query(query, [title, description, link, image, projectId], (err, result) => {
        if (err) throw err;
        res.redirect(`/project/${projectId}`);
    });
});

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

// Route to delete a project
app.delete('/project/:id', (req, res) => {
    const projectId = req.params.id;
    const query = 'DELETE FROM projects WHERE id = ?';

    db.query(query, [projectId], (err, result) => {
        if (err) throw err;
        res.redirect('/projects');
    });
});



