const _ = require('lodash');
const log4js = require('log4js');
const logger = log4js.getLogger('favorites');

const util = require('./util.js');

const db = require('../db/db.js').getInstance();

module.exports.getFavorites = () => {

    return new Promise((resolve, reject) => {
        logger.debug('START getFavorites');

        const docList = [];

        db.getAllDocs().then((body) => {
            logger.debug('total # of docs -> %d', body.rows.length);
            const promises = [];
            _.forEach(body.rows, (document) => {
                promises.push(db.getDoc(document.id, {
                    revs_info: true
                }));
            });
            return Promise.all(promises);
        }).then((responses) => {
            logger.trace('Documents retrieved: %j', responses);
            _.forEach(responses, (doc) => {
                let responseData;

                if (doc._attachments) {
                    const attachments = [];
                    for (const attribute in doc._attachments) {
                        if (doc._attachments[attribute] && doc._attachments[attribute].content_type) {
                            attachments.push({
                                'key': attribute,
                                'type': doc._attachments[attribute].content_type
                            });
                        }
                        logger.debug('%s: %j', attribute, doc._attachments[attribute]);
                    }
                    responseData = util.createResponseData(
                        doc._id,
                        doc.name,
                        doc.value,
                        attachments);

                } else {
                    responseData = util.createResponseData(
                        doc._id,
                        doc.name,
                        doc.value, []);
                }

                docList.push(responseData);
            });
            return resolve(docList);
        }).catch((err) => {
            logger.error('Error in retrieving favorites: %s - %j', err.message, err.stack);
            return reject(err);
        });
    });
};

module.exports.createFavorite = (name, value) => {

    return new Promise((resolve, reject) => {
        logger.debug('START createFavorite');
        const _name = util.sanitizeInput(name);
        const _value = util.sanitizeInput(value);

        db.createDoc({
            name: _name,
            value: _value
        }).then((doc) => {
            logger.debug('Document created: %j', doc);
            return resolve(doc);
        }).catch((err) => {
            logger.error(err);
            return reject(err);
        });
    });
};

module.exports.putFavorite = (id, name, value) => {

    return new Promise((resolve, reject) => {
        logger.debug('START putFavorite');

        const _name = util.sanitizeInput(name);
        const _value = util.sanitizeInput(value);

        db.getDoc(id, {
            revs_info: true
        }).then((doc) => {
            logger.trace('Document with id %s: %j', id, doc);
            doc.name = _name;
            doc.value = _value;
            return db.updateDoc(doc, doc.id);
        }).then((doc) => {
            logger.debug('Document updated: %j', doc);
            return resolve();
        }).catch((err) => {
            logger.error(err);
            return reject(err);
        });
    });

};

module.exports.deleteFavorite = (id) => {
    return new Promise((resolve, reject) => {
        logger.debug('START deleteFavorite');
        db.getDoc(id, {
            revs_info: true
        }).then((doc) => {
            logger.trace('Document with id %s: %j', id, doc);
            return db.deleteDoc(id, doc._rev);
        }).then((res) => {
            logger.debug('Delete response: %j', res);
            return resolve();
        }).catch((err) => {
            logger.error(err);
            return reject(err);
        });
    });

};
