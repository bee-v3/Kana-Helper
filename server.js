const express = require('express');
const path = require('path');

const app = express();

// Serve only the static files form the dist directory
app.use(express.static(__dirname + '/dist/kana-helper/'));

app.get('/*', function(req,res) {

res.sendFile(path.join(__dirname+'/dist/kana-helper/index.html'));
});

// Start the app by listening on the default Heroku port
app.listen(process.env.PORT || 4200);


// Handles exit events
function exitHandler(exitCode) {
    if (exitCode) console.log(exitCode);
    process.exit();
}

// Graceful exit
process.on('exit', exitHandler.bind(0));


// CTRL + C event exit
process.on('SIGINT', exitHandler.bind(1));

// Uncaught exception exit
process.on('uncaughtException', exitHandler.bind(2));
