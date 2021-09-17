let db, config;

module.exports = (_db, _config) => {
    db = _db;
    config = _config;
    return Publications;
}

let Publications = class {

    static getPhotoByPublicationId(publicationId) {
        return new Promise((next) => {
            let id;
            if (publicationId != undefined && publicationId != null) {
                id = parseInt(publicationId);
                db.query('SELECT * FROM publications WHERE id_publications = ?', [id])
                    .then((result) => {
                        if (result.length > 0) next(result);
                        else next(new Error('La photo n\'à pas été trouvé! '))
                    })
            }
            else next(new Error('id invalide'));
        })

    }

    static getAllPhotoByUserId(userId) {
        return new Promise((next) => {
            let id;
            if (userId != undefined && userId != null && !isNaN(userId)) {
                id = parseInt(userId);
                db.query("SELECT * FROM publications WHERE id_users = ?", [id])
                    .then((result) => next(result));

            }
            else {
                next(new Error('id incorrect !'));
            }
        });
    }
    static addPhoto(url, date, idUser) {
        return new Promise((next) => {
            let dbUrl, dbDate, dbidUser;
            if (idUser != undefined && idUser != null) {
                dbidUser = parseInt(idUser);
                db.query("SELECT * FROM users WHERE id_users = ?", [dbidUser])
                    .then((result) => {
                        if (result.length > 0) {
                            if (url != undefined && url.trim() != "" && date != undefined && date.trim() != "") {
                                dbUrl = url.trim();
                                dbDate = date.trim().toString();
                                db.query("INSERT INTO publications (url, date, id_users) values(?,?,?)", [dbUrl, dbDate, dbidUser])
                                    .then((result) => next(result));
                            }
                            else {
                                next(new Error('Erreur avec url, date ou id utilisateur '));
                            }
                        }
                        else {
                            next(new Error('utilisateur non trouvé !'))
                        }
                    })
            }
            else {
                next(new Error('identifiant utilisateur incorrect :('))
            }
        });
    }


    static likePublication(idUser, idPublication) {
        return new Promise((next) => {
            let userId, publicationId;
            if (idUser != undefined && idUser != null && idPublication != undefined && idPublication != null) {
                userId = idUser;
                publicationId = idPublication;
                db.query("SELECT * FROM publications WHERE id_publications = ?", [publicationId])
                    .then((result) => {
                        if (result.length > 0) {
                            db.query('SELECT * FROM users_publications WHERE id_users = ? AND id_publications = ?', [userId, publicationId])
                                .then((result) => {
                                    if (result.length > 0) next(new Error('Vous avez deja liké cette photo!'));
                                    else {
                                        db.query('INSERT INTO users_publications (id_users, id_publications) values (?,?)', [userId, publicationId])
                                            .then((result) => next(result))
                                            .catch((err) => next(err));
                                    }
                                })
                        }
                        else next(new Error('La photo n\'existe pas !'));
                    })
            }
            else {
                next(new Error('incorrect id  !'));
            }
        });
    }

    static getPublicationsLikedByUserId(userId) {
        return new Promise((next) => {
            let id;
            if (userId != undefined && userId != null && !isNaN(userId)) {
                id = userId;
                db.query('SELECT * FROM publications JOIN users_publications ON users_publications.id_publications = publications.id_publications WHERE users_publications.id_users = ?', [id])
                    .then((result) => {
                        if (result.length > 0) {
                            next(result);
                        } else {
                            next(new Error('Aucune photo trouvé !'))
                        }
                    })

            }
            else next(new Error('id incorrect ! '));
        });
    }

    static getLikes(id) {
        return new Promise((next) => {
            if(id.trim()!= undefined && id !== null){
                db.query("SELECT count(id_publications) as likes from users_publications WHERE id_publications = ?", [id])
                    .then((result) => {
                        next(result);
                    })
                    .catch(err => next(new Error(err.message)));
            }else{
                next(new Error("l'id est incorrect!"));
            }
        });
    }

    static getPublicationsLiked() {
        return new Promise((next) => {
            db.query("SELECT id_publications, count(*) as likes from users_publications GROUP BY id_publications ")
                .then((result) => {
                    next(result);
                })
                .catch(err => next(new Error(err.message)));
        });
    }
    static getAllPublications() {
        return new Promise((next) => {
            db.query("SELECT publications.id_publications, publications.url, publications.date, users.id_users, users.photo, users.username, users.bio, users.email  FROM publications INNER JOIN users ON publications.id_users = users.id_users")
                .then(result => {
                    next(result);
                })
                .catch(err => {
                    console.error(err)
                    next(new Error(err));
                })

        })
    }

    static getAllPublicationsExceptFromId(id) {
        return new Promise((next) => {
            if(id!= undefined && id != null){
                db.query("SELECT publications.id_publications, publications.url, publications.date, users.id_users, users.photo, users.username, users.bio, users.email FROM publications INNER JOIN users ON publications.id_users = users.id_users AND  users.id_users != ?", [id])
                    .then(result => {
                        next(result);
                    })
                    .catch(err => {
                        console.error(err)
                        next(new Error(err));
                    })
            }
           else{
            next(new Error("erreur d'id!"));

           } 
        })
    }

    static deletePublication(id){
        return new Promise((next)=> {
            if(id != undefined && id!= null){
                db.query("DELETE FROM publications WHERE publications.id_publications = ?", [id])
                    .then(result => {
                        db.query("DELETE  FROM users_publications WHERE users_publications.id_publications = ?", [id])
                            .then(result => next(result))
                            .catch(err => next(new Error(err)));
                    })
                    .catch(err => next(new Error(err)));
            }
            else{
                next(new Error("id incorrect ! "))
            }
        });
    }


}