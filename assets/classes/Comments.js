let db, config;

module.exports = (_db, _config) => {
    db = _db;
    config = _config;
    return Comments;
}

let Comments = class{

    static addComment(content, date, publicationId){
        return new Promise((next)=>{
            let idPhoto, text, datedb;
            if(publicationId !=undefined && publicationId.trim()!=""){
                idPhoto = publicationId.trim();
                db.query('SELECT * FROM publications WHERE id_publications = ?',[idPhoto])
                    .then((result)=>{
                        if(result.length > 0){
                            if(content!=undefined && content.trim()!=""){
                                text = content.trim();
                                datedb = date;
                                db.query("INSERT INTO comments (date, content, id_publications) VALUES(?,?,?)", [datedb, text, idPhoto])
                                    .then((result)=> next(result))
                                    .catch((err)=> next(err));
                            } else next(new Error('Aucun contenu n\'a été envoyé!'))

                        }
                        else next(new Error('La publication n\'a pas été trouvé!'));
                    })
            }
            else next(new Error('photo id undefined! '))

        });
    }

    static getComment(photoId){
        return new Promise((next)=>{
            let id;
            if(photoId != undefined && photoId.trim()!=""){
                id = photoId;
                db.query('SELECT * FROM comments WHERE id_publications =?',[id])
                    .then((result)=> next(result))
                    .catch((err)=> next(err));
            }else next(new Error('identifiant incorrect!'));
        });
    }

    static getAllComments(){
        return new Promise((next) => {
            db.query('SELECT * FROM comments')
                .then(result => next(result))
                .catch(err => next(new Error(err)));
        });
    }



    

}