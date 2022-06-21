// Connect to ROS
const ros = new ROSLIB.Ros({
    url: 'ws://192.168.0.12:9090'
    // url: 'ws://localhost:9090'
});

ros.on('connection', () => console.log('Connected to websocket server.'));
ros.on('error', error => console.log('Error connecting to websocket server: ', error));
ros.on('close', () => console.log('Connection to websocket server closed.'));


class App {
    ros
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

    constructor(ros) {
        this.ros = ros
    }

    init() {
        // Initialize TF
        this.tf_client = new ROSLIB.TFClient({
            ros: this.ros, fixedFrame: this.ground_frame, angularThres: 0.01, transThres: 0.01
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
            ros: this.ros, rootObject: this.viewer.scene
        });

        // Scale the canvas to fit to the map
        this.map_client.on('change', () => this.viewer.scaleToDimensions(this.map_client.currentGrid.width, this.map_client.currentGrid.height));
    }
}


class LaserScanRenderer {
    app
    topic

    marker_radius
    marker_stroke_color
    marker_fill_color

    listener
    prev_scan_markers

    constructor(options) {
        options = options || {}
        this.app = options.app
        this.topic = options.topic || "/scan"
        this.marker_radius = options.marker_radius || 4
        this.marker_stroke_color = options.marker_stroke_color || createjs.Graphics.getRGB(255, 0, 0, 0.5)
        this.marker_fill_color = options.marker_fill_color || createjs.Graphics.getRGB(255, 0, 0, 1.0)

        this.listener = new ROSLIB.Topic({
            ros: this.app.ros, name: this.topic, messageType: 'sensor_msgs/LaserScan'
        });

        this.prev_scan_markers = null

        this.listener.subscribe(this.callback.bind(this));

    }

    callback(msg) {

        // TODO: Take tf origin frame from the header and dont assume that it is always `base_footprint`

        // Find points in the laser scan frame
        const num = msg.ranges.length
        const angles = Array.from({length: num}, (_, i) => msg.angle_min + (msg.angle_max - msg.angle_min) / num * i)
        const poses_2d = angles.flatMap((angle, index) => {
            const range = msg.ranges[index];
            if (range > msg.range_min && range < msg.range_max) {
                return [[Math.cos(angle) * range, Math.sin(angle) * range, -angle]]
            }
            return []  // Skip this point
        });


        if (this.app.base_footprint_tf === null) {
            console.log('no tf');
            return;
        }

        // TODO: We might be able to apply the tf transform to the container itself, and dont have to do it on each pose.
        // Init the graphics component
        const scan_markers = new createjs.Container();

        const graphics = new createjs.Graphics();
        graphics.beginStroke(this.marker_stroke_color);
        graphics.beginFill(this.marker_fill_color);
        graphics.drawCircle(0, 0, this.marker_radius)
        graphics.endFill();
        graphics.endStroke();

        // Transform each point and add it to the graphics
        poses_2d.forEach(pt => {
            // pt[2] += Math.PI / 2
            const pose = new ROSLIB.Pose({
                position: new ROSLIB.Vector3({
                    x: pt[0], y: pt[1], z: 0
                }), orientation: new ROSLIB.Quaternion({
                    x: 0, y: 0, z: Math.cos(pt[2]), w: Math.sin(pt[2])

                })
            })
            pose.applyTransform(this.app.base_footprint_tf)

            const marker = new createjs.Shape(graphics)
            marker.x = pose.position.x;
            marker.y = -pose.position.y;
            marker.rotation = this.app.viewer.scene.rosQuaternionToGlobalTheta(pose.orientation);
            marker.scaleX = 1.0 / this.app.viewer.scene.scaleX;
            marker.scaleY = 1.0 / this.app.viewer.scene.scaleY;

            scan_markers.addChild(marker)
        })

        // TODO: Just update the old one, dont make new ones everytime
        if (this.prev_scan_markers !== null) this.app.viewer.scene.removeChild(this.prev_scan_markers)

        this.app.viewer.addObject(scan_markers)
        this.prev_scan_markers = scan_markers
    }

}

const app = new App(ros);

const laser_scan = new LaserScanRenderer({app: app, topic: "/scan"})


document.addEventListener('DOMContentLoaded', app.init.bind(app), false);
