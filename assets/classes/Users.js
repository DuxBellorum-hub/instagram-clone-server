let db, config, validator, bcrypt, jwt, promisify;

module.exports = (_db, _config,_validator, _bcrypt, _jwt, _promisify) => {
    db = _db;
    config = _config;
    bcrypt = _bcrypt;
    validator = _validator;
    jwt = _jwt;
    promisify = _promisify
    return Users;
}

let Users = class {


    static getUserById(id) {
        return new Promise((next) => {
            let intId = +id;
            if (intId != undefined && !Number.isNaN(intId)) {
                db.query('SELECT * from users WHERE id_users = ?', [id])
                    .then((result) => {
                        if (result.length > 0) {
                            let { password, ...user } = result[0];
                            next(user);
                        }
                        else {
                            next(new Error(`L\'utilisateur n'a pas été trouvé!`));
                        }
                    })

            } else {
                next(new Error('id incorrect!'))
            }
        });

    }

    static getAllUsersWhoPublished() {
        return new Promise((next) => {
            db.query("SELECT DISTINCT users.id_users, users.username, users.photo FROM users RIGHT JOIN publications ON users.id_users = publications.id_users")
                .then(result => {
                    next(result);
                })
                .catch(err => next(new Error(err)))
        });
    }

    static addUser(username, email, password) {
        return new Promise((next) => {
            let name, mail, pass;
            if (email != undefined && email.trim() != "") {
                mail = email.trim();
                db.query('SELECT * FROM users WHERE email = ?', [mail])
                    .then((result) => {
                        if (result.length > 0) {
                            next(new Error('Cet email est déjà utilisé'));
                        }
                        else if (validator.validate(mail) != true) {
                            next(new Error("Email invalide"))
                        }
                        else {
                            if (username != undefined && username.trim() != "") {
                                name = username.trim();
                                db.query('SELECT * FROM users WHERE username = ?', [name])
                                    .then((result) => {
                                        if (result[0] != undefined) {
                                            next(new Error('Nom d\'utilisateur indisponible'))
                                        }
                                        else {
                                            if (password === undefined || password.trim() == "") {
                                                next(new Error("Mot de passe invalide"));
                                            }
                                            else {
                                                this.encryptPassword(password)
                                                    .then((result) => {
                                                        pass = result;

                                                        return db.query('INSERT INTO users(username, email, password) VALUES(?,?,?)', [name, mail, pass]);
                                                    }).then((result) => next(result));
                                            }
                                        }
                                    }).catch((err) => next(err));

                            }
                            else {
                                next(new Error('Nom d\'utilisateur invalide'));
                            }

                        }
                    })
            }
            else {
                next(new Error('Email invalide'))
            }
        })
    }

    static editProfilPhoto(urlPhoto, idUser) {
        return new Promise((next) => {
            let url, id;
            if (urlPhoto != undefined && urlPhoto.trim() != "" && idUser != undefined && idUser != null) {
                url = urlPhoto.trim();
                id = idUser.trim();
                db.query("UPDATE users SET photo = ? WHERE id_users = ?", [url, id])
                    .then((result) => next(result))
                    .catch((err) => next(err));

            } else next(new Error('Paramètres invalides !'));
        });
    }

    static updateUser(username, bio, idUser) {
        return new Promise((next) => {
            let name, biog, id;
            if (idUser != undefined && idUser != null && username != undefined && username.trim() != "") {
                id = idUser;
                name = username.trim();
                biog = bio != null ? bio.trim() : null;
                db.query("SELECT * FROM users WHERE username = ? AND id_users != ?", [name, id])
                    .then((result) => {
                        if (result.length > 0) next(new Error('Nom d\'utilisateur déjà pris ! '))
                        else {
                            db.query("UPDATE users SET username = ? , bio = ? WHERE id_users = ?", [name, biog, id])
                                .then((result) => next(result))
                                .catch((err) => next(err));
                        }
                    }).catch((err) => next(err));

            }
            else {
                next(new Error('Un des champs au moins est vide!'));
            }
        });
    }

    static editPassword(password, idUser) {
        return new Promise((next) => {
            let pass, id;
            if (idUser != undefined && idUser != null) {
                id = idUser;
                if (password != undefined && password.trim() != "") {
                    this.encryptPassword(password).then((result) => {
                        pass = result;
                        db.query("UPDATE users SET password = ? WHERE id_users =?", [pass, id])
                            .then((result) => {
                                next(result);
                            })
                            .catch((err) => next(err));

                    })
                } else {
                    next(new Error('Mot de passe invalide !'));
                }

            }
            else {
                next(new Error('id incorrect !'));
            }
        });
    }

    static deleteAccount(idUser, password) {
        return new Promise((next) => {
            let id, pass;
            if (idUser != undefined && idUser != null && password != undefined && password.trim() != "") {
                id = idUser;
                pass = password.trim();
                db.query('SELECT * FROM users WHERE id_users = ?', [id])
                    .then((result) => {
                        if (result.length > 0) {

                            db.query('SELECT password FROM users WHERE id_users = ?', [id])
                                .then((result) => {
                                    this.decryptPassword(pass, result[0].password)
                                        .then((result) => {
                                            if (result) {
                                                db.query('DELETE FROM users WHERE id_users = ?', [id])
                                                    .then(() => {
                                                        db.query('DELETE FROM publications WHERE id_users =?', [id])
                                                            .then(() => next(true))
                                                            .catch((err) => next(err));
                                                    })
                                                    .catch((err) => next(err));
                                            }
                                            else next(new Error('Mot de passe incorrect!!'))
                                        })

                                })
                                .catch((err) => next(err));
                        }
                        else next(new Error('utilisateur non trouvé ! '))

                    });
            }
            else {
                next(new Error('identifiant ou mot de passe manquant! '))
            }

        });
    }


    static async encryptPassword(password) {
        let salt = await bcrypt.genSalt(10);
        let hash = await bcrypt.hash(password, salt);
        return hash;
    }

    static async decryptPassword(password, hash) {
        let compare = await bcrypt.compare(password, hash);
        return compare;
    }


    static login(req, res, next) {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(401).json("Un des champs est manquant ! ");
            next();
        } else {
            db.query('SELECT * from users WHERE email = ?', [email])
                .then(async result => {
                    if (!result[0] || !(await bcrypt.compare(password, result[0].password))) {
                        res.status(401).json("Email ou mot de passe incorrect ! ");
                        next();
                    }
                    else {
                        const id = result[0].id_users;
                        const token = jwt.sign({ id: id }, process.env.JWT_SECRET, {
                            expiresIn: process.env.JWT_EXPIRES_IN
                        });
                        const cookieOptions = {
                            expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
                            httpOnly: true
                        };
                        res.status(200).json({ "token": token });

                    }
                })
                .catch(err => console.log(err.message));

        }

    }



    static async userIdWithToken(req, res, next) {
        if (req.body.token) {
            const decoded = await promisify(jwt.verify)(req.body.token, process.env.JWT_SECRET);
            req.user = decoded.id;
            return next();
        }
        else {
            next();
        }

        ;
    }







}