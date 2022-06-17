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


class App {
    width = 1200
    height = 500
    scale_factor = 1.0

    div_el_id = 'nav'

    div_el
    gridClient
    viewer

    on_wheel(ev) {
        this.scale_factor += ev.deltaY / 1000
        this.scale_factor = this.scale_factor <= 0 ? 0.1 : this.scale_factor

        this.viewer.scaleToDimensions(Math.floor(this.width * this.scale_factor), Math.floor(this.height * this.scale_factor))
        console.log(this.scale_factor, Math.floor(this.width * this.scale_factor), Math.floor(this.height * this.scale_factor))
    }

    on_canvas_change() {
        this.viewer.scaleToDimensions(this.gridClient.currentGrid.width, this.gridClient.currentGrid.height);
    }

    init_nav2djs() {

        this.div_el = document.getElementById(this.div_el_id)
        // Create the main viewer.
        this.viewer = new ROS2D.Viewer({
            divID: this.div_el_id, width: this.width, height: this.height
        });

        this.div_el.addEventListener("wheel", this.on_wheel.bind(this));

        // Set up the map client.
        this.gridClient = new ROS2D.OccupancyGridClient({
            ros: ros, rootObject: this.viewer.scene
        });

        // Scale the canvas to fit to the map
        this.gridClient.on('change', this.on_canvas_change.bind(this));
    }
}

const app = new App();
// Subscribing to a Topic
// ----------------------

const listener = new ROSLIB.Topic({
    ros: ros, name: '/scan', messageType: 'sensor_msgs/LaserScan'
});

listener.subscribe(function (message) {
    console.log('Received message on ' + listener.name + ': ' + message.header.frame_id);
    listener.unsubscribe();
});


document.addEventListener('DOMContentLoaded', app.init_nav2djs.bind(app), false);
