const express = require("express");
const app = express();
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const mysql = require('promise-mysql');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const validator = require('email-validator');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const { static } = require("express");
const cors = require('cors');
const { promisify } = require('util');
const { fileFilter } = require('./assets/functions');

app.use(cors({ credentials: true, origin: 'http://localhost:4200' }));

const storagePublications = multer.diskStorage({
    destination: './imagesUploaded/publications/',
    filename: (req, file, callback) => {
        crypto.pseudoRandomBytes(16, (err, raw) => {
            if (err) return callback(err);
            callback(null, raw.toString('hex') + path.extname(file.originalname));
        });
    }
});
const uploadPublications = multer({
    fileFilter: (req, file, cb) => {
        fileFilter(req, file, cb);
    },
    storage: storagePublications
});

const storageProfil = multer.diskStorage({
    destination: './imagesUploaded/profilUsers/',
    filename: (req, file, callback) => {
        crypto.pseudoRandomBytes(16, (err, raw) => {
            if (err) return callback(err);
            callback(null, raw.toString('hex') + path.extname(file.originalname));
        });
    }
});
const uploadProfil = multer({
    fileFilter: (req, file, cb) => {
        fileFilter(req, file, cb);
    },
    storage: storageProfil
});

const uploadDirectoryPublications = path.join(__dirname, './imagesUploaded/publications');
app.use(express.static(uploadDirectoryPublications));

const uploadDirectoryProfilUsers = path.join(__dirname, './imagesUploaded/profilUsers');
app.use(express.static(uploadDirectoryProfilUsers));


mysql.createPool({
    connectionLimit: 100,
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
}).then((db) => {
    console.log('connected to db');


    let Users = require('./assets/classes/Users')(db, process.env, validator, bcrypt, jwt, promisify);
    let Publications = require('./assets/classes/Publications')(db, process.env);
    let Comments = require('./assets/classes/Comments')(db, process.env);
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true }))


    app.get('/users/published', async (req, res) => {
        let users = await Users.getAllUsersWhoPublished();
        if (users instanceof Error) {
            res.json("Error: " + users.message);
        }
        else {
            res.status(200).json(users);
        }
    });

    app.get('/users/:id', async (req, res) => {
        let user = await Users.getUserById(req.params.id);
        if (user instanceof Error) {
            console.log(user.message);
            res.json("Error: " + user.message);
        }
        else {
            res.status(200).json(user);
        }
    });



    app.post('/users/add', async (req, res) => {
        let user = await Users.addUser(req.body.username, req.body.email, req.body.password, req.body.bio);
        if (user instanceof Error) {
            console.error(user.message);
            res.status(409).json("Error: " + user.message);
        }
        else {
            res.status(200).json(user);
        }
    });

    app.post('/login', Users.login);
    app.post('/token', Users.userIdWithToken, (req, res) => {
        if (!req.user) {
            res.status(404).json("Token invalid")
        }
        res.status(200).json(req.user)

    });


    app.get('/publications/like', async (req, res) => {
        let like = await Publications.getPublicationsLiked();
        if (like instanceof Error) {
            console.error(like.message);
            res.status(404).json("Error: " + like.message);
        } else {
            res.status(200).json(like);
        }
    });



    app.post('/users/publications/add', uploadPublications.single('publications'), async (req, res) => {

        if (req.file == undefined) return res.status(400).json("no image uploaded ! ");
        else {
            if (!req.file.originalname.match(/\.(jpg|jpeg|png)$/)) {
                console.log("err format img")
                return res.status(400).json({ msg: 'Seuls les formats jpg, jpeg et png sont autorisés !' });
            }
            else {
                let publications = await Publications.addPhoto(req.file.filename, req.body.date, req.body.idUser);
                if (publications instanceof Error) {
                    res.status(409).json(`Error: ${publications.message}`);
                }
                else {
                    res.status(201).json(publications.insertId);
                }
            }
        }

    });

    app.put('/users/:id/edit', async (req, res) => {
        let edit = await Users.updateUser(req.body.username, req.body.bio, req.params.id);
        if (edit instanceof Error) {
            console.log(edit.message);
            res.status(400).send(edit.message);
        }
        else {
            res.status(200).json(edit);
        }

    });

    app.put('/users/:id/edit/photo', uploadProfil.single('photoProfil'), async (req, res) => {

        if (req.file == undefined) return res.status(400).json("no image uploaded ! ");
        else {
            if (!req.file.originalname.match(/\.(jpg|jpeg|png)$/) || req.filename == "") {
                return res.status(400).json({ msg: 'Seuls les formats jpg, jpeg et png sont autorisés !' });
            }
            else {

                let photoProfil = await Users.editProfilPhoto(req.file.filename, req.params.id);
                if (photoProfil instanceof Error) {
                    console.log(photoProfil.message)
                    res.status(409).json(`Error: ${photoProfil.message}`);
                }
                else {
                    res.status(201).json(photoProfil);
                }
            }
        }
    });




    app.put('/users/:id/edit/password', async (req, res) => {
        let newPass = await Users.editPassword(req.body.password, req.params.id);
        if (newPass instanceof Error) {
            console.log(newPass.message);
            res.status(400).json(newPass.message);
        } else {
            res.status(200).json({ msg: "Mot de passe a été modifié avec succès!" });
        }
    });

    app.get('/users/:id/publications', async (req, res) => {
        let allPublications = await Publications.getAllPhotoByUserId(req.params.id);
        if (allPublications instanceof Error) {
            console.error(allPublications.message);
            res.status(404).json(`Error: ${allPublications.message}`);
        }
        else {
            res.status(200).json(allPublications);
        }

    });

    app.get('/all/publications', async (req, res) => {
        let allPublications = await Publications.getAllPublications();
        if (allPublications instanceof Error) {
            console.error(allPublications.message);
            res.status(404).json(`Error: ${allPublications.message}`);
        }
        else {
            res.status(200).json(allPublications);
        }

    });

    app.get('/all/publications/connected/:id', async (req, res) => {

        let allPublications = await Publications.getAllPublicationsExceptFromId(req.params.id);
        if (allPublications instanceof Error) {
            console.error(allPublications.message);
            res.status(404).json(`Error: ${allPublications.message}`);
        }
        else {
            res.status(200).json(allPublications);
        }
    });

    app.get('/publications/:id', async (req, res) => {
        let photo = await Publications.getPhotoByPublicationId(req.params.id);
        if (photo instanceof Error) {
            console.log(photo.message);
            res.status(404).json('Error : ' + photo.message);
        }
        else {
            res.status(200).json(photo);
        }

    });

    app.post('/publications/:id/like', async (req, res) => {
        let like = await Publications.likePublication(req.body.idUser, req.params.id);
        if (like instanceof Error) {
            console.log(like.message);
            res.status(400).json({ err: like.message });
        } else {
            res.status(200).json(like);
        }
    });

    app.get('/publications/:id/likes', async (req, res) => {
        let likes = await Publications.getLikes(req.params.id);
        if (likes instanceof Error) {
            console.log(likes.message);
            res.status(400).json({ err: likes.message });
        } else {
            res.status(200).json(likes);
        }
    });

    app.delete('/publications/:id/delete', async (req, res) => {
        let deletePublication = await Publications.deletePublication(req.params.id);
        if (deletePublication instanceof Error) {
            console.log(deletePublication.message);
            res.status(400).json(deletePublication);
        } else {
            res.status(204).json(deletePublication);
        }
    });

    app.get('/users/:id/publications/like', async (req, res) => {
        let publicationsLiked = await Publications.getPublicationsLikedByUserId(req.params.id);
        if (publicationsLiked instanceof Error) {
            console.log(publicationsLiked.message);
            res.status(400).json(publicationsLiked.message);
        }
        else {
            res.status(200).json(publicationsLiked);
        }
    });



    app.post('/users/:id/delete', async (req, res) => {
        console.log(req.params.id, req.body.password)
        let deleteUser = await Users.deleteAccount(req.params.id, req.body.password);
        if (deleteUser instanceof Error) {
            console.log(deleteUser.message);
            res.status(400).json(deleteUser.message);
        }
        res.status(200).json({ msg: "L'utilisateur et toutes ses données ont été supprimées" });

    });

    app.get('/comments', async (req, res) => {
        let comments = await Comments.getAllComments();
        if (comments instanceof Error) {
            console.error(comments.message);
            res.status(400).json(comments.message);
        } else {
            res.status(200).json(comments);
        }

    });

    app.post('/publication/:id/comment/add', async (req, res) => {
        let comment = await Comments.addComment(req.body.content, req.body.date, req.params.id);
        if (comment instanceof Error) {
            console.log(comment.message);
            res.status(400).json(comment.message);
        }
        res.status(200).json(comment);
    });

    app.get('/publication/:id/comments', async (req, res) => {
        let comments = await Comments.getComment(req.params.id);
        if (comments instanceof Error) res.status(400).json(comments.message);
        res.status(200).json(comments);
    });

    app.use((req, res) => {
        const err = new Error('404 - Not found ! ');
        err.status = 404;
        console.log(err)
        res.json({ msg: err.message, status: err.status });
    });

    app.listen(8080, () => {
        console.log("Run on port 8080");
    });
}).catch((err) => {
    console.log('Error during db connection');
    console.log(err);
});





