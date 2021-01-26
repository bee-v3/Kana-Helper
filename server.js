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
function exitHandler(options, exitCode) {
    if (options.cleanup) console.log('clean');
    if (exitCode || exitCode === 0) console.log(exitCode);
    if (options.exit) process.exit();
}

// Graceful exit
process.on('exit', exitHandler.bind({cleanup:true, exit:true}, 0));


// CTRL + C event exit
process.on('SIGINT', exitHandler.bind({exit:true}, 1));

// Uncaught exception exit
process.on('uncaughtException', exitHandler.bind(null, 1));
