// Connect to ROS
const ros = new ROSLIB.Ros({
    url: 'ws://192.168.0.12:9090'
    // url: 'ws://localhost:9090'
});

ros.on('connection', () => console.log('Connected to websocket server.'));
ros.on('error', error => console.log('Error connecting to websocket server: ', error));
ros.on('close', () => console.log('Connection to websocket server closed.'));


class App {
    ground_frame = "map"
    width = 720
    height = 655
    scale_factor = 1.0

    tf_client
    base_footprint_tf = null

    div_el_id = 'nav'
    div_el

    viewer
    zoom_view
    map_client

    init() {
        // Initialize TF
        this.tf_client = new ROSLIB.TFClient({
            ros: ros, fixedFrame: this.ground_frame, angularThres: 0.01, transThres: 0.01
        })
        this.tf_client.subscribe('/base_footprint', transform => this.base_footprint_tf = transform)


        // Create the frontend
        this.div_el = document.getElementById(this.div_el_id)
        this.viewer = new ROS2D.Viewer({
            divID: this.div_el_id, width: this.width, height: this.height
        });
        this.zoom_view = new ROS2D.ZoomView({
            rootObject: this.viewer.scene
        })
        this.zoom_view.startZoom(this.width / 2, this.height / 2)
        // Dunno why this is required
        // Please don't zoom until this timeout occurs
        setTimeout(() => this.zoom_view.startZoom(this.width / 2, this.height / 2), 1000)

        // Setup zoom and pan hooks
        // TODO: Check out PanView
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
        this.map_client = new ROS2D.OccupancyGridClient({
            ros: ros, rootObject: this.viewer.scene
        });

        // Scale the canvas to fit to the map
        this.map_client.on('change', () => this.viewer.scaleToDimensions(this.map_client.currentGrid.width, this.map_client.currentGrid.height));
    }
}

const app = new App();


// Set up laser scan display:

let prev_scan_markers = null;
const listener = new ROSLIB.Topic({
    ros: ros, name: '/scan', messageType: 'sensor_msgs/LaserScan'
});

listener.subscribe(function (msg) {
    // TODO: Take tf origin frame from the header and dont assume that it is always `base_footprint`

    const num = msg.ranges.length
    const angles = Array.from({length: num}, (_, i) => msg.angle_min + (msg.angle_max - msg.angle_min) / num * i)

    // Find points in the laser scan frame
    const poses_2d = angles.flatMap((angle, index) => {
        const range = msg.ranges[index];
        if (range > msg.range_min && range < msg.range_max) {
            return [[Math.cos(angle) * range, Math.sin(angle) * range, -angle]]
        }
        return []  // Skip this point
    });

    // TODO: We might be able to apply the tf transform to the container itself, and dont have to do it on each pose.
    const scan_markers = new createjs.Container();

    if (app.base_footprint_tf === null) {
        console.log('no tf');
        return;
    }

    poses_2d.forEach(pt => {
        const pose = new ROSLIB.Pose({
            position: new ROSLIB.Vector3({
                x: pt[0], y: pt[1], z: 0
            }), orientation: new ROSLIB.Quaternion({
                x: 0, y: 0, z: Math.cos(pt[2]), w: Math.sin(pt[2])

            })
        })
        pose.applyTransform(app.base_footprint_tf)

        const marker = new ROS2D.NavigationArrow({
            size: 0,
            strokeSize: 3,
            strokeColor: createjs.Graphics.getRGB(255, 0, 0, 0.5),
            fillColor: createjs.Graphics.getRGB(255, 0, 0, 0.5),
            pulse: false,

        });

        marker.x = pose.position.x;
        marker.y = -pose.position.y;
        // marker.rotation = (app.viewer.scene.rosQuaternionToGlobalTheta(pose.orientation) + Math.PI / 2) % (Math.PI * 2);
        marker.rotation = (app.viewer.scene.rosQuaternionToGlobalTheta(pose.orientation)) % (Math.PI * 2);
        marker.scaleX = 1.0 / app.viewer.scene.scaleX;
        marker.scaleY = 1.0 / app.viewer.scene.scaleY;


        scan_markers.addChild(marker)
    })

    // TODO: Just update the old one, dont make new ones everytime
    if (prev_scan_markers !== null) app.viewer.scene.removeChild(prev_scan_markers)

    app.viewer.addObject(scan_markers)
    prev_scan_markers = scan_markers
});


document.addEventListener('DOMContentLoaded', app.init.bind(app), false);
