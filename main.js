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
    width = 1000
    height = 500
    scale_factor = 1.0

    div_el_id = 'nav'

    div_el
    gridClient
    viewer
    zoom_view


    init() {

        this.div_el = document.getElementById(this.div_el_id)

        // Create the main viewer.
        this.viewer = new ROS2D.Viewer({
            divID: this.div_el_id, width: this.width, height: this.height
        });

        this.zoom_view = new ROS2D.ZoomView({
            rootObject: this.viewer.scene
        })
        this.zoom_view.startZoom(this.width / 2, this.height / 2)
        // Dunno why this is required
        setTimeout(() => this.zoom_view.startZoom(this.width / 2, this.height / 2), 1000)

        // Setup zoom and pan
        this.div_el.addEventListener("wheel", (ev) => {
            this.scale_factor -= ev.deltaY / 1000
            this.scale_factor = this.scale_factor <= 0 ? this.zoom_view.minScale : this.scale_factor
            this.zoom_view.zoom(this.scale_factor)
        });
        this.div_el.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) {
                // The y-axis is flipped in ROS
                this.viewer.shift(-e.movementX / this.viewer.scene.scaleX, e.movementY / this.viewer.scene.scaleY)
                this.zoom_view.startZoom(this.width / 2, this.height / 2)
            }
        })

        // Set up the map client.
        this.gridClient = new ROS2D.OccupancyGridClient({
            ros: ros, rootObject: this.viewer.scene
        });

        // Scale the canvas to fit to the map
        this.gridClient.on('change', () => this.viewer.scaleToDimensions(this.gridClient.currentGrid.width, this.gridClient.currentGrid.height));
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


document.addEventListener('DOMContentLoaded', app.init.bind(app), false);
