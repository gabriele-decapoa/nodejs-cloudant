const multipart = require('connect-multiparty');
const multipartMiddleware = multipart();
const log4js = require('log4js');
const logger = log4js.getLogger('routes');

const router = require('express').Router();
const favorites = require('./favorites.js');
const attachments = require('./attachments.js');

const health = require('@cloudnative/health-connect');
const healthcheck = new health.HealthChecker();

const serveIndex = (req, res) => {
    res.render('index.html', {title: 'Cloudant Boiler Plate'});
};

const getFavorites = (req, res) => {
    favorites.getFavorites().then((docList) => {
        return res.status(200).json(docList).end();
    }).catch((err) => {
        return res.status(500).send(err).end();
    });

};

const postFavorites = (req, res) => {
    const name = req.body.name;
    const value = req.body.value;
    logger.info('Create a document with name %s and value %s', name, value);

    favorites.createFavorite(name, value).then((doc) => {
        return res.status(201).json({id: doc.id}).end();
    }).catch((err) => {
        return res.status(500).json(err).end();
    });
};

const putFavorites = (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    const value = req.body.value;
    logger.info('Update document %s', id);

    favorites.putFavorite(id, name, value).then(() => {
        return res.status(200).end();
    }).catch((err) => {
        return res.status(500).json(err).end();
    });
};

const deleteFavorites = (req, res) => {

    const id = req.query.id;
    logger.debug('Removing document of ID: %s', id);

    favorites.deleteFavorite(id).then(() => {
        return res.status(200).end();
    }).catch((err) => {
        return res.status(500).json(err).end();
    });
};

const getAttachments = (req, res) => {
    const id = req.query.id;
    const key = req.query.key;

    attachments.getAttachment(id, key).then((body) => {
        res.setHeader('Content-Disposition', 'inline; filename=\'' + key + '\'');
        return res.status(200).send(body).end();
    }).catch((err) => {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(500).send('Error: ' + err).end();
    });

};

const postAttachments = (req, res) => {
    const id = req.query.id;
    const name = req.query.name;
    const value = req.query.value;
    const file = req.files.files;

    attachments.addAttachment(id, name, value, file).then((responseData) => {
        return res.status(200).json(responseData).end();
    }).catch((err) => {
        return res.status(500).send(err).end();
    });


};

const livePromise = new Promise((resolve) => {
    setTimeout(() => {
        logger.trace('ALIVE!');
        return resolve();
    }, 10);
});

const readyPromise = new Promise((resolve) => {
    setTimeout(() => {
        logger.trace('READY!');
        return resolve();
    }, 10);
});

const shutdownPromise = new Promise((resolve) => {
    setTimeout(() => {
        logger.trace('DONE!');
        return resolve();
    }, 10);
});

healthcheck.registerReadinessCheck(new health.ReadinessCheck('readyCheck', readyPromise));
healthcheck.registerLivenessCheck(new health.LivenessCheck('liveCheck', livePromise));
healthcheck.registerShutdownCheck(new health.ShutdownCheck('shutdownCheck', shutdownPromise));

router.get('/', serveIndex);

router.get('/api/favorites', getFavorites);
router.post('/api/favorites', postFavorites);
router.put('/api/favorites', putFavorites);
router.delete('/api/favorites', deleteFavorites);

router.get('/api/favorites/attach', getAttachments);
router.post('/api/favorites/attach', multipartMiddleware, postAttachments);

router.get('/health', health.LivenessEndpoint(healthcheck));
router.get('/ready', health.ReadinessEndpoint(healthcheck));


module.exports = router;
