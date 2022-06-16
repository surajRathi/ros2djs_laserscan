// Connecting to ROS
// -----------------

const ros = new ROSLIB.Ros({
    url: 'ws://localhost:9090'
});

ros.on('connection', function () {
    console.log('Connected to websocket server.');
});

ros.on('error', function (error) {
    console.log('Error connecting to websocket server: ', error);
});

ros.on('close', function () {
    console.log('Connection to websocket server closed.');
});


// Subscribing to a Topic
// ----------------------

const listener = new ROSLIB.Topic({
    ros: ros, name: '/beat', messageType: 'std_msgs/String'
});

listener.subscribe(function (message) {
    console.log('Received message on ' + listener.name + ': ' + message.data);
    listener.unsubscribe();
});

function init_nav2djs() {
    // Create the main viewer.
    const viewer = new ROS2D.Viewer({
        divID: 'nav', width: 750, height: 800
    });

    // Setup the map client.
    var gridClient = new ROS2D.OccupancyGridClient({
        ros: ros, rootObject: viewer.scene
    });

    // Scale the canvas to fit to the map
    gridClient.on('change', function () {
        viewer.scaleToDimensions(gridClient.currentGrid.width, gridClient.currentGrid.height);
    });

}

document.addEventListener('DOMContentLoaded', init_nav2djs, false);
