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
    ground_frame = "map"
    width = 1000
    height = 500
    scale_factor = 1.0

    div_el_id = 'nav'

    div_el
    gridClient
    viewer
    zoom_view

    tf_client
    base_footprint_tf = null


    init() {

        this.tf_client = new ROSLIB.TFClient({
            ros: ros, fixedFrame: this.ground_frame, angularThres: 0.01, transThres: 0.01
            // ros: ros, fixedFrame: this.ground_frame, angularThres: 0.01, transThres: 0.01
        })

        this.tf_client.subscribe('/base_footprint', transform => this.base_footprint_tf = transform)

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
        // TODO: Use PanView
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
let scan_marker = null;
const listener = new ROSLIB.Topic({
    ros: ros, name: '/scan', messageType: 'sensor_msgs/LaserScan'
});

listener.subscribe(function (msg) {
    const num = msg.ranges.length
    const angles = Array.from({length: num}, (_, i) => msg.angle_min + (msg.angle_max - msg.angle_min) / num * i)
    const pts = angles.flatMap((angle, index) => {
        const range = msg.ranges[index];
        if (range > msg.range_min && range < msg.range_max) {
            // console.log(Math.cos(angle) * range, Math.sin(angle) * range)
            return [[Math.cos(angle) * range, Math.sin(angle) * range, -angle]]
        }
        return []
    });
    // console.log(pts)

    // the library has a bug where fillColor and pointColor are the same, and taken from pointColor
    const marker = new createjs.Container();

    if (app.base_footprint_tf === null) {
        console.log('no tf');
        return;
    }
    // console.log('using tf')

    pts.forEach(pt => {
        const p_p = new ROSLIB.Pose({
            position: new ROSLIB.Vector3({
                x: pt[0], y: pt[1], z: 0
            }), orientation: new ROSLIB.Quaternion({
                x: 0, y: 0, z: Math.cos(pt[2]), w: Math.sin(pt[2])

            })
        })
        p_p.applyTransform(app.base_footprint_tf)

        const goalMarker = new ROS2D.NavigationArrow({
            size: 0,
            strokeSize: 5,
            strokeColor: createjs.Graphics.getRGB(255, 0, 0, 0.5),
            fillColor: createjs.Graphics.getRGB(255, 0, 0, 0.5),
            pulse: false,

        });
        goalMarker.x = p_p.position.x;
        goalMarker.y = -p_p.position.y;
        goalMarker.rotation = app.viewer.scene.rosQuaternionToGlobalTheta(p_p.orientation);
        goalMarker.scaleX = 1.0 / app.viewer.scene.scaleX;
        goalMarker.scaleY = 1.0 / app.viewer.scene.scaleY;


        marker.addChild(goalMarker)
    })

    // 2. Convert them to ground frame

    // TODO: Just update the old one, dont make new ones everytime
    if (scan_marker !== null) app.viewer.scene.removeChild(scan_marker)

    app.viewer.addObject(marker)
    scan_marker = marker
});


document.addEventListener('DOMContentLoaded', app.init.bind(app), false);
